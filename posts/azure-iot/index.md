# Azure IoT



# Verify Azure IoT MQ Broker at the Edge

Since you are **Owner** on the edge machine + Azure, you can confirm the broker and its connectivity from both ends.

### a) Check in IoT Operations Portal (GUI)

1. Go to your instance (Sites → Instances → Your Edge Instance).
1. In the left menu, select Data flow endpoints.
  * You should see one called MQTT (Default) or similar. This is the built-in broker endpoint.
    ![Image](img-1f4eb56e-image.png)
    
    * Click into it and check:
    * Hostname / IP → where clients should connect.
      ![Image](img-1f4eb56e-image.png)
      
      * Port(s) → usually 8883 (TLS) and possibly 1883 (non-TLS).
    * Provisioning state → should be Succeeded.
      ![Image](img-1f4eb56e-image.png)
      
      1. Optional: under Activity logs, you can see connection attempts and provisioning messages for that endpoint.
  ![Image](img-1f4eb56e-image.png)
  
  # Verify & Test Azure IoT MQ (Broker) from the Edge (K3s)

> Why netstat doesn’t show port 18883: the broker is exposed as a Kubernetes ClusterIP service (internal only), not a host socket. Use kubectl to verify and test.

## 1) Verify pods and services

```bash
# Namespace
NS=azure-iot-operations

# Pods (broker components must be Running)
kubectl get pods -n $NS

# Broker services (expect ClusterIP on 18883/TCP)
kubectl get svc -n $NS | grep -E 'aio-broker|broker'
kubectl get svc aio-broker -n $NS -o wide
kubectl get endpoints aio-broker -n $NS -o wide


```

You should see `aio-broker` with `PORT(S) 18883/TCP` and a backing endpoint like `10.x.x.x:18883`.

## 2) Start a long-running tools pod (for client tests)

```bash
kubectl run -n $NS mqtt-tools \
  --restart=Never --image=alpine:3.19 \
  --command -- sh -c "sleep infinity"

kubectl -n $NS wait --for=condition=Ready pod/mqtt-tools --timeout=90s

# Install test tools inside the pod
kubectl -n $NS exec -it mqtt-tools -- sh -lc 'apk add --no-cache mosquitto-clients openssl ca-certificates'


```

## 3) Get the broker’s server name and trust chain

The broker’s cert must match your hostname and chain to a CA you trust.

```bash
# Inspect the server certificate from its TLS secret (optional)
kubectl -n $NS get secret aio-broker-frontend-server-18883 \
  -o jsonpath='{.data.tls\.crt}' | base64 -d > /tmp/broker-server.crt
openssl x509 -in /tmp/broker-server.crt -noout -text | egrep -A2 'Subject:|DNS:'
# SANs usually include:
#   aio-broker, aio-broker.azure-iot-operations, aio-broker.azure-iot-operations.svc.cluster.local


```

Now pull the presented chain **from the live broker** and extract the **root CA** it uses:

```bash
# Inside the tools pod: capture presented certs
kubectl -n $NS exec -it mqtt-tools -- sh -lc '
echo | openssl s_client -connect aio-broker.azure-iot-operations:18883 \
  -servername aio-broker.azure-iot-operations -showcerts 2>/dev/null \
| awk "/-----BEGIN CERTIFICATE-----/{i++} {print > (\"/tmp/peer-cert-\" i \".pem\") } END{ print i, \"certs saved\" }"
for f in /tmp/peer-cert-*.pem; do echo "== $f =="; openssl x509 -in "$f" -noout -subject -issuer; done'


```

You should see something like:

* /tmp/peer-cert-1.pem — server leaf: CN = aio-broker-frontend-server-18883
* /tmp/peer-cert-2.pem — self-signed root: CN = Azure IoT Operations Quickstart Root CA - Not for Production
Save that root CA to a fixed filename:

```bash
# Copy the presented root CA to a known path inside the pod
kubectl -n $NS exec -it mqtt-tools -- sh -lc 'cp /tmp/peer-cert-2.pem /tmp/aio-broker-root-ca.pem'

# Sanity check: TLS must verify with this CA
kubectl -n $NS exec -it mqtt-tools -- sh -lc '
echo | openssl s_client -connect aio-broker.azure-iot-operations:18883 \
  -servername aio-broker.azure-iot-operations \
  -CAfile /tmp/aio-broker-root-ca.pem -verify_return_error 2>/dev/null \
| grep "Verify return code"'
# Expect: Verify return code: 0 (ok)


```

> If you see Verify return code: 19 (self-signed certificate in certificate chain), you’re using the wrong CA file. Use the presented root (peer-cert-2.pem) as shown above.

## 4) Create a Kubernetes Service Account Token (audience aio-internal)

```bash
kubectl -n $NS create token default --audience=aio-internal --duration=1h > /tmp/aio-token.txt
kubectl -n $NS cp /tmp/aio-token.txt mqtt-tools:/tmp/aio-token.txt


```

## 5) Publish/subscribe using MQTT v5 Enhanced Auth (K8S-SAT)

> Do not use -u/-P. The broker expects MQTT v5 enhanced auth with method K8S-SAT and your SA token as authentication-data.

```bash
# Publish
kubectl -n $NS exec -it mqtt-tools -- sh -lc '
mosquitto_pub -h aio-broker.azure-iot-operations -p 18883 \
  --cafile /tmp/aio-broker-root-ca.pem \
  -V mqttv5 \
  -D CONNECT authentication-method "K8S-SAT" \
  -D CONNECT authentication-data "$(cat /tmp/aio-token.txt)" \
  -t test/topic -m "hello-from-k8s-sat" -d'

# Subscribe (receive one message)
kubectl -n $NS exec -it mqtt-tools -- sh -lc '
mosquitto_sub -h aio-broker.azure-iot-operations -p 18883 \
  --cafile /tmp/aio-broker-root-ca.pem \
  -V mqttv5 \
  -D CONNECT authentication-method "K8S-SAT" \
  -D CONNECT authentication-data "$(cat /tmp/aio-token.txt)" \
  -t "test/#" -v -C 1 -d'


```

You should see a successful `CONNACK` and the published message.

## Troubleshooting quick reference

* TLS verify fails (code 19) → Use the presented root CA (Quickstart Root) from /tmp/peer-cert-2.pem, not aio-broker-internal-ca.
* Hostname mismatch → Use a SAN from the server cert, e.g. aio-broker.azure-iot-operations.
* Connection drops after TLS → Ensure you’re using MQTT v5 enhanced auth:
  * D CONNECT authentication-method "K8S-SAT"
  * D CONNECT authentication-data "$(cat /tmp/aio-token.txt)"
  * Token audience must be aio-internal.
  * Service not reachable externally → It’s ClusterIP. For external devices, use kubectl port-forward for testing or change the service to NodePort behind proper firewalling/LB.

