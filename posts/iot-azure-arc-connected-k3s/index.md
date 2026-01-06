# IoT - Azure Arc Connected K3s 


Starting from an Ubuntu server, which has be Arc Enabled, we can use this as a base for the Azure IoT Operations.

1. Arc Enabled Ubuntu Server
1. K3s Kubernetes on Ubuntu (Single or Multi-Node)
## Installing K3s

K3s provides an installation script that is a convenient way to install it as a service on `systemd` or `openrc` based systems. This script is available at [https://get.k3s.io](https://get.k3s.io/). To install K3s using this method, connect to the server using `ssh` and then run:

```bash
sysadmin@otedge001:~$ curl -sfL https://get.k3s.io | sh -
[sudo] password for sysadmin: 

[INFO]  Finding release for channel stable
[INFO]  Using v1.32.3+k3s1 as release
[INFO]  Downloading hash https://github.com/k3s-io/k3s/releases/download/v1.32.3+k3s1/sha256sum-amd64.txt
[INFO]  Downloading binary https://github.com/k3s-io/k3s/releases/download/v1.32.3+k3s1/k3s
[INFO]  Verifying binary download
[INFO]  Installing k3s to /usr/local/bin/k3s
[INFO]  Skipping installation of SELinux RPM
[INFO]  Creating /usr/local/bin/kubectl symlink to k3s
[INFO]  Creating /usr/local/bin/crictl symlink to k3s
[INFO]  Creating /usr/local/bin/ctr symlink to k3s
[INFO]  Creating killall script /usr/local/bin/k3s-killall.sh
[INFO]  Creating uninstall script /usr/local/bin/k3s-uninstall.sh
[INFO]  env: Creating environment file /etc/systemd/system/k3s.service.env
[INFO]  systemd: Creating service file /etc/systemd/system/k3s.service
[INFO]  systemd: Enabling k3s unit
Created symlink /etc/systemd/system/multi-user.target.wants/k3s.service → /etc/systemd/system/k3s.service.
[INFO]  systemd: Starting k3s
```

After running this installation:

* The K3s service will be configured to automatically restart after node reboots or if the process crashes or is killed
* Additional utilities will be installed, including kubectl, crictl, ctr, k3s-killall.sh, and k3s-uninstall.sh
* A kubeconfig file will be written to /etc/rancher/k3s/k3s.yaml and the kubectl installed by K3s will automatically use it
A single-node server installation is a fully-functional Kubernetes cluster, including all the datastore, control-plane, kubelet, and container runtime components necessary to host workload pods. It is not necessary to add additional server or agents nodes, but you may want to do so to add additional capacity or redundancy to your cluster.

To install additional agent nodes and add them to the cluster, run the installation script with the `K3S_URL` and `K3S_TOKEN` environment variables. Here is an example showing how to join an agent:

```shell
curl -sfL https://get.k3s.io | K3S_URL=https://myserver:6443 K3S_TOKEN=mynodetoken sh -
```

Setting the `K3S_URL` parameter causes the installer to configure K3s as an agent, instead of a server. The K3s agent will register with the K3s server listening at the supplied URL. The value to use for `K3S_TOKEN` is stored at `/var/lib/rancher/k3s/server/node-token` on your server node.


> [!tip] 💡 
> Each machine must have a unique hostname. If your machines do not have unique hostnames, pass the K3S_NODE_NAME environment variable and provide a value with a valid and unique hostname for each node.
### K3s Configuration

When you install K3s on Ubuntu using the quick install script, it places the Kubernetes configuration file at `/etc/rancher/k3s/k3s.yaml`, which is only accessible by the root user. To use `kubectl` as a non-root user, it’s best to create your own user-level kubeconfig file. 

The following commands will create a `.kube` directory in your home folder, merge the system kubeconfig with your local config, and generate a flattened, self-contained kubeconfig that you can safely use without needing root access. This setup is particularly useful when you're managing clusters through automation or integrating with tools like Azure Arc, Helm, or GitOps pipelines.

```bash
# Create the .kube directory in your home folder if it doesn't exist
mkdir -p ~/.kube

# Merge the root-level K3s kubeconfig with your user config (if any) into a flattened kubeconfig
# This avoids future permission issues and makes the config self-contained
sudo KUBECONFIG=~/.kube/config:/etc/rancher/k3s/k3s.yaml kubectl config view --flatten > ~/.kube/merged

# Replace your current user kubeconfig with the merged version
mv ~/.kube/merged ~/.kube/config

# Set secure permissions so only your user can read/write the kubeconfig
chmod 0600 ~/.kube/config

# Set the environment variable so kubectl knows to use your local config
export KUBECONFIG=~/.kube/config

# Switch to the K3s context (usually named 'default' after install)
kubectl config use-context default

# (Optional) Make the original K3s config world-readable to prevent issues with other tools
sudo chmod 644 /etc/rancher/k3s/k3s.yaml
```

After either fix, you should be able to run:

```bash
sysadmin@otedge001:~$ kubectl version --client
Client Version: v1.32.3+k3s1
Kustomize Version: v5.5.0

sysadmin@otedge001:~$ kubectl get nodes
NAME        STATUS   ROLES                  AGE   VERSION
otedge001   Ready    control-plane,master   14m   v1.32.3+k3s1
```

And see your K3s node(s) listed.

### Performance Tweaks

1. Run the following command to increase the user watch/instance limits.
  ```bash
  echo fs.inotify.max_user_instances=8192 | sudo tee -a /etc/sysctl.conf
  echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
  
  sudo sysctl -p
  ```
  
  1. For better performance, increase the file descriptor limit:
  ```bash
  echo fs.file-max = 100000 | sudo tee -a /etc/sysctl.conf
  
  sudo sysctl -p
  ```
  
  
## Arc Enable K3s

Since your server is **Arc-enabled** and you’ve got **K3s running**, the next step is to get the **Azure CLI (**`**az**`**)** installed so you can register the Kubernetes cluster with **Azure Arc**

### Install az CLI

Update your packages and install prerequisites

```bash
sudo apt update
sudo apt install ca-certificates curl apt-transport-https lsb-release gnupg -y

#Add the Microsoft signing key
curl -sL https://packages.microsoft.com/keys/microsoft.asc | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/microsoft.gpg

# Add rhw Azure CLI software Repo
AZ_REPO=$(lsb_release -cs)
echo "deb [arch=amd64] https://packages.microsoft.com/repos/azure-cli/ $AZ_REPO main" | sudo tee /etc/apt/sources.list.d/azure-cli.list
```

Now, we just need to update the package index and then we can install Azure CLI:

```bash
sudo apt update
sudo apt install azure-cli -y

# Test this all worked
az version
{
  "azure-cli": "2.71.0",
  "azure-cli-core": "2.71.0",
  "azure-cli-telemetry": "1.1.0",
  "extensions": {}
}
```

### Connect K3s cluster to Azure Arc

Log in to Azure

```bash
az login

To sign in, use a web browser to open the page https://microsoft.com/devicelogin and enter the code DFVLJBMXT to authenticate.
```

Register resource providers

```bash
az provider register --namespace 'Microsoft.Kubernetes'
az provider register --namespace 'Microsoft.KubernetesConfiguration'
az provider register --namespace "Microsoft.ExtendedLocation"
az provider register --namespace "Microsoft.SecretSyncController"

# Install Azure Arc CLI extension
az extension add --name connectedk8s
az extension add --name k8s-extension
az extension add --name customlocation
```

Connect your K3s cluster to Azure Arc, we will use the following. To prevent unplanned updates to Azure Arc and the system Arc extensions that Azure IoT Operations uses as dependencies, this command disables auto upgrade. Instead, [manually upgrade agents](https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/agent-upgrade#manually-upgrade-agents) as needed.

> 📢 If your environment uses a proxy server or Azure Arc Gateway, modify the az connectedk8s connect command with your proxy information:
  1. Follow the instructions in either Connect using an outbound proxy serveror Onboard Kubernetes clusters to Azure Arc with Azure Arc Gateway.
  1. Add 169.254.169.254 to the -proxy-skip-range parameter of the az connectedk8s connect command. Azure Device Registry uses this local endpoint to get access tokens for authorization.
  Azure IoT Operations doesn't support proxy servers that require a trusted certificate.
  
  ```bash
# Create a new resource group for each cluster
# This will be North Europe, with a resoruce group called iot-edge01
az group create --location NorthEurope --resource-group iot-edge01  --subscription df56d048-2e20-4ab6-82b7-11643163aa53

# Connect K8s
# Naming the cluster as you like, example is to use the machine name
az connectedk8s connect --name otedge001 --location NorthEurope --resource-group iot-edge01  --subscription df56d048-2e20-4ab6-82b7-11643163aa53 --enable-oidc-issuer --enable-workload-identity --disable-auto-upgrade

Argument '--enable-oidc-issuer' is in preview and under development. Reference and support levels: https://aka.ms/CLI_refstatus
Argument '--enable-workload-identity' is in preview and under development. Reference and support levels: https://aka.ms/CLI_refstatus
This operation might take a while...

Step: 2025-04-24T13-25-44Z: Validating custom access token
Step: 2025-04-24T13-25-44Z: Checking Provider Registrations
Step: 2025-04-24T13-25-44Z: Setting KubeConfig
Step: 2025-04-24T13-25-44Z: Escape Proxy Settings, if passed in
Step: 2025-04-24T13-25-44Z: Checking Connectivity to Cluster
Step: 2025-04-24T13-25-44Z: Do node validations
Step: 2025-04-24T13-25-44Z: Install Kubectl client if it does not exist
Downloading kubectl client for first time. This can take few minutes...
To check existing issues, please visit: https://github.com/Azure/azure-cli/issues


Step: 2025-04-24T13-25-57Z: Install Helm client if it does not exist
Downloading helm client for first time. This can take few minutes...
Step: 2025-04-24T13-25-59Z: Starting Pre-onboarding-check
Step: 2025-04-24T13-25-59Z: Creating folder for Cluster Diagnostic Checks Logs
Step: 2025-04-24T13-25-59Z: Get namespace of release: cluster-diagnostic-checks
Step: 2025-04-24T13-26-00Z: Determine Helmchart Export Path
Step: 2025-04-24T13-26-00Z: Pulling HelmChart: mcr.microsoft.com/azurearck8s/helmchart/stable/clusterdiagnosticchecks, Version: 0.2.2
Step: 2025-04-24T13-26-00Z: Chart path for Cluster Diagnostic Checks Job: /home/sysadmin/.azure/PreOnboardingChecksCharts/clusterdiagnosticchecks
Step: 2025-04-24T13-26-00Z: Creating Cluster Diagnostic Checks job
Step: 2025-04-24T13-26-18Z: The required pre-checks for onboarding have succeeded.
Step: 2025-04-24T13-26-18Z: Checking if user can create ClusterRoleBindings
Step: 2025-04-24T13-26-18Z: Determining Cluster Distribution and Infrastructure
Step: 2025-04-24T13-26-18Z: Checking Connect RP is available in the Location passed in.
Step: 2025-04-24T13-26-18Z: Check if an earlier azure-arc release exists
Step: 2025-04-24T13-26-18Z: Get namespace of release: azure-arc
Step: 2025-04-24T13-26-18Z: Deleting Arc CRDs
Step: 2025-04-24T13-26-23Z: Check if ResourceGroup exists.  Try to create if it doesn't
Step: 2025-04-24T13-26-23Z: Generating Public-Private Key pair
Step: 2025-04-24T13-26-33Z: Generating ARM Request Payload
Step: 2025-04-24T13-26-33Z: Azure resource provisioning has begun.
Step: 2025-04-24T13-28-05Z: Azure resource provisioning has finished.
Step: 2025-04-24T13-28-05Z: Checking Custom Location(Microsoft.ExtendedLocation) RP Registration state for this Subscription, and attempt to get the Custom Location Object ID (OID),if registered
Step: 2025-04-24T13-28-06Z: Determine Helmchart Export Path
Step: 2025-04-24T13-28-06Z: Pulling HelmChart: mcr.microsoft.com/azurearck8s/batch2/stable/v2/azure-arc-k8sagents, Version: 1.24.4
Step: 2025-04-24T13-28-07Z: Starting to install Azure arc agents on the Kubernetes cluster.
Step: 2025-04-24T13-50-47Z: Wait for Agent State to reach terminal state, with timeout of 15
Step: 2025-04-24T13-52-59Z: Agent state has reached terminal state.
{
  "aadProfile": {
    "adminGroupObjectIDs": null,
    "enableAzureRbac": null,
    "tenantId": null
  },
  "agentPublicKeyCertificate": "MIICCgKCAgEAy+XlOGoDAMtAN/ush1ssMALY6CbdAUy5hDiJMoCXexNu8yfO0hnLIJgBhX+Z0aWyBe7Hlzpt/kT9RArpq0VQ8MYbkIUF9GlQpqaAXeV8Ffh/9pFEAUKjHJWuE6rvoWxfTXPod4iXk83qthW49Y3m42L5dW3YzzHH3FHDzlE9AWi3IvH6pakgkqIqnoKfJkPsUf0WCghqsKVPKM7nC+2vTSryzHZJOLD0/3sicncg4A6vCkFpCwyrmKZdpqAoTmej/Ghmky4ihuq5Y+JlNnK2jgZIxjs3bnS9zgQEApJpz7hkLkHyYZqkFrlKT9UD9Xg7+T5uvcWcUo66e/1XY73H/Whz8QHDTNqO8oNbTXMh5WnRTa5MrsPEAVkWFtwAX6Cvujz/uqJ3fYc4t8recC96GuvuWiwrgfUlP4UfiovFTYkqVjVYKPqO9DjUAlxoPXa5DjFPWzcbCO25o8Z61mSBNq3+Wmh1PjGatwMLiwXxUssOwN2gX3+dG3mwNXU2bPOIhYJhvWtZL7OWgwFPmuyw4BNAURuMlWAUBsp6oi7X3KBUCA/DNl1tEmOKzm7pnIWZ6pJnQ75XrH/VadU4H47USoa2MeCyOGsA+Y3Bcxpoyfcp4hMX3gXeEL+1B+X0MqzWiew8iB0ifdHy4+5jBGNl7hLDNE/zM5BzCOdlR8MmAxsCAwEAAQ==",
  "agentVersion": "1.24.4",
  "arcAgentProfile": {
    "agentAutoUpgrade": "Disabled",
    "agentErrors": [],
    "agentState": "Succeeded",
    "desiredAgentVersion": null,
    "systemComponents": null
  },
  "arcAgentryConfigurations": null,
  "azureHybridBenefit": "NotApplicable",
  "connectivityStatus": "Connected",
  "distribution": "k3s",
  "distributionVersion": null,
  "gateway": null,
  "id": "/subscriptions/df56d048-2e20-4ab6-82b7-11643163aa53/resourceGroups/iot-edge01/providers/Microsoft.Kubernetes/connectedClusters/otedge001",
  "identity": {
    "principalId": "bcba8744-7ed9-4e0a-8909-c10d0db2d354",
    "tenantId": "d993d9e4-644e-4d0a-ba80-0e010d0ea023",
    "type": "SystemAssigned"
  },
  "infrastructure": "K3s",
  "kind": null,
  "kubernetesVersion": "1.32.3+k3s1",
  "lastConnectivityTime": "2025-04-24T13:50:50.589000+00:00",
  "location": "NorthEurope",
  "managedIdentityCertificateExpirationTime": null,
  "miscellaneousProperties": null,
  "name": "otedge001",
  "offering": null,
  "oidcIssuerProfile": {
    "enabled": true,
    "issuerUrl": "https://europe.oic.prod-arc.azure.com/d993d9e4-644e-4d0a-ba80-0e010d0ea023/b1ba6b46-f5cf-49cb-b278-1af11d320898/",
    "selfHostedIssuerUrl": null
  },
  "privateLinkScopeResourceId": null,
  "privateLinkState": "Disabled",
  "provisioningState": "Succeeded",
  "resourceGroup": "iot-edge01",
  "securityProfile": {
    "workloadIdentity": {
      "enabled": true
    }
  },
  "systemData": {
    "createdAt": "2025-04-24T13:48:30.074643+00:00",
    "createdBy": "Technology@damianflynn.com",
    "createdByType": "User",
    "lastModifiedAt": "2025-04-24T13:52:57.017210+00:00",
    "lastModifiedBy": "64b12d6e-6549-484c-8cc6-6281839ba394",
    "lastModifiedByType": "Application"
  },
  "tags": {},
  "totalCoreCount": 4,
  "totalNodeCount": 1,
  "type": "microsoft.kubernetes/connectedclusters"
}
```

Upon completion, you will have your Kubernetes cluster connected as a new Azure Arc-enabled Kubernetes resource inside your resource group.

Check the started POD's in the "azure-arc" namespace

```bash
kubectl get pods -o wide -n azure-arc
NAME                                          READY   STATUS    RESTARTS      AGE   IP           NODE        NOMINATED NODE   READINESS GATES
cluster-metadata-operator-b76b5b684-x2gfg     2/2     Running   0             9h    10.42.0.26   otedge001   <none>           <none>
clusterconnect-agent-56498f5fc9-g9tkm         3/3     Running   0             9h    10.42.0.31   otedge001   <none>           <none>
clusteridentityoperator-747fc6c5c-9mjcq       2/2     Running   4 (87s ago)   9h    10.42.0.35   otedge001   <none>           <none>
config-agent-f94fbb799-jst99                  2/2     Running   0             9h    10.42.0.29   otedge001   <none>           <none>
controller-manager-5cff79bbcf-2jv4t           2/2     Running   0             9h    10.42.0.30   otedge001   <none>           <none>
extension-events-collector-7574559c9f-sdz55   2/2     Running   0             9h    10.42.0.34   otedge001   <none>           <none>
extension-manager-c56d45d8c-ngbhf             3/3     Running   0             9h    10.42.0.32   otedge001   <none>           <none>
flux-logs-agent-74f5446b47-gr2k2              1/1     Running   0             9h    10.42.0.36   otedge001   <none>           <none>
kube-aad-proxy-9cd74fbb5-s5j5f                2/2     Running   0             9h    10.42.0.37   otedge001   <none>           <none>
logcollector-5f6d749774-tw2j9                 1/1     Running   0             9h    10.42.0.28   otedge001   <none>           <none>
metrics-agent-85f4bf4b4d-lvs75                2/2     Running   0             9h    10.42.0.33   otedge001   <none>           <none>
resource-sync-agent-7689dd6fbc-qxwt8          2/2     Running   0             9h    10.42.0.27   otedge001   <none>           <none>
```

### Enable Custom Locations on the Cluster

Get the Clusters Issuer URL, as we need to add this to the kube-apiserver

```bash
# Grab the Issuer URL
az connectedk8s show --resource-group iot-edge01 --name otedge001 --query oidcIssuerProfile.issuerUrl --output tsv

https://europe.oic.prod-arc.azure.com/d993d9e4-644e-4d0a-ba80-0e010d0ea023/b1ba6b46-f5cf-49cb-b278-1af11d320898/
```

Add the following content to a new configuration file at `etc/rancher/k3s/config.yaml` file, replacing the `<SERVICE_ACCOUNT_ISSUER>` placeholder with your cluster's issuer URL, that we just retrieved using the command `sudo vi /etc/rancher/k3s/config.yaml` and add the content

```plain text
kube-apiserver-arg:
 - service-account-issuer=<SERVICE_ACCOUNT_ISSUER>
 - service-account-max-token-expiration=24h
```

Now, prepare for enabling the Azure Arc service, custom location, on your Arc cluster by getting the custom location object ID and saving it as the environment variable, OBJECT_ID. You must be logged into Azure CLI with a Microsoft Entra user account to successfully run the command, not a service principal. Run the following command **exactly as written**, without changing the GUID value.

```bash
export OBJECT_ID=$(az ad sp show --id bc313c14-388c-4e7d-a58e-70017303ee3b --query id -o tsv)
```

Use the [`az connectedk8s enable-features`](https://learn.microsoft.com/en-us/cli/azure/connectedk8s#az-connectedk8s-enable-features) command to enable the custom location feature on your Arc cluster. This command uses the OBJECT_ID environment variable saved from the previous step to set the value for the custom-locations-oid parameter.

```bash
sysadmin@otedge001:~$ az connectedk8s enable-features --resource-group iot-edge01 --name otedge001 --custom-locations-oid $OBJECT_ID --features cluster-connect custom-locations

This command is in preview and under development. Reference and support levels: https://aka.ms/CLI_refstatus
This operation might take a while...

Step: 2025-04-24T23-22-56Z: Validating custom access token
Step: 2025-04-24T23-22-56Z: Checking Custom Location(Microsoft.ExtendedLocation) RP Registration state for this Subscription, and attempt to get the Custom Location Object ID (OID),if registered
Step: 2025-04-24T23-22-57Z: Setting KubeConfig
Step: 2025-04-24T23-22-57Z: Checking Connectivity to Cluster
Step: 2025-04-24T23-22-57Z: Install Helm client if it does not exist
Step: 2025-04-24T23-22-57Z: Get namespace of release: azure-arc
Step: 2025-04-24T23-22-57Z: Getting HelmPackagePath from Arc DataPlane
Step: 2025-04-24T23-22-58Z: Determine Helmchart Export Path
Step: 2025-04-24T23-22-58Z: Pulling HelmChart: mcr.microsoft.com/azurearck8s/batch2/stable/v2/azure-arc-k8sagents, Version: 1.24.4
Important! Custom Location feature enablement can't be validated when using a manually provided OID. If the custom location feature is not enabled, you may encounter an error when creating the custom location.
After creating the custom location, run `az customlocation show` and check that ProvisioningState is Succeeded. If ProvisoningState is Failed, then re-try this command with a  valid custom location OID to enable the feature.
For guidance, refer to: https://aka.ms/enable-customlocation
"Successsfully enabled features: ['cluster-connect', 'custom-locations'] for the Connected Cluster otedge001"
```

Now, we can restart the k3s Cluster

```bash
systemctl restart k3s
```

### Check the Azure UI

Fantastic, We now should have be base K3s environment connected to Azure, Launch the Portal, to get information on our Arc managed cluster. Here we should be presented with details related to the version and state of our instance.

![Image](img-1dfeb56e-image.png)

## Managing the Cluster

To also get information about the namespaces and the running workloads in Azure and more, a bearer token is needed.

### Create Service Account and Retrieve Token

Therefore we need to create a service account token in our Kubernetes cluster and generate the token for it.

With the `kubeconfig` file pointing to the `apiserver` of your Kubernetes cluster, run this command to create a service account. This example creates the service account in the default namespace, but you can substitute any other namespace for `default`.

```bash
kubectl create serviceaccount arc-user -n default
```

Create a ClusterRoleBinding to [grant this service account the appropriate permissions on the cluster](https://kubernetes.io/docs/reference/access-authn-authz/rbac/#kubectl-create-rolebinding). If you used a different namespace in the first command, substitute it here for `default`.

```bash
kubectl create clusterrolebinding arc-user-binding --clusterrole cluster-admin --serviceaccount default:arc-user
```

Create a service account token:

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: arc-user-secret
  annotations:
    kubernetes.io/service-account.name: arc-user
type: kubernetes.io/service-account-token
EOF
```

Now, lets get the token we need to use in the Azure Portal

```bash
TOKEN=$(kubectl get secret arc-user-secret -o jsonpath='{$.data.token}' | base64 -d | sed 's/$/\n/g')
echo $TOKEN
```

### Add Token to the Azure Portal

Open the **Kubernettes Resources **pane, and navigate to the **Namespaces **area

![Image](img-1dfeb56e-image.png)

Paste the token we just created, and click the button **Sign In**. After a moment the UX will update, and we should see all the namespaces on our new cluster

![Image](img-1dfeb56e-image.png)

## Testing a Deployment

Lets activate the quickstart demo application from Azure (azure-vote) to test the deployment via Azure and to see a running workload by using the Azure UI.

Navigate to Workloads \ Add with YAML \ Deploy a quickstart application… and follow the steps.

![Image](img-1dfeb56e-image-10.png)

The link to the application will be posted directly after the deployment. Just wait some seconds for the service to be ready.

![Image](img-1dfeb56e-image-7.png)

You can now check the running POD’s in your Kubernetes environment for the azure-vote demo application.

* kubectl get pods -o wide -n azure-vote
![Image](img-1dfeb56e-image-9.png)


## Access the k3s from a Developer Computer with Azure Arc

Using the Azure Portal to access the Kubernetes cluster is nice but as a developer, I am used to using `kubectl` or any custom dashboards. To access the Kubernetes cluster from my Windows computer, I will use the following Azure CLI command, remember to replace *<TOKEN>* with the previously created token.

```bash
PS C:\Users\sysadmin> az connectedk8s proxy --resource-group iot-edge01 --name otedge001 --token eyJhbGciOiJSUzI1NiIsImtpZCI6IkdQa2ZwTDhmSUxGcWtsRDhndV9zOTNGRE8tNmd5R3lZVE8zVUR4ZDZSRncifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJkZWZhdWx0Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZWNyZXQubmFtZSI6ImFyYy11c2VyLXNlY3JldCIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VydmljZS1hY2NvdW50Lm5hbWUiOiJhcmMtdXNlciIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VydmljZS1hY2NvdW50LnVpZCI6IjY0MDU0N2JmLTk5MGYtNGNkNi05NzdlLTkyYWEzMDcxZjkzZCIsInN1YiI6InN5c3RlbTpzZXJ2aWNlYWNjb3VudDpkZWZhdWx0OmFyYy11c2VyIn0.TxDTXr1yqTRlIbCvQjYKTHd8FvxvriPPZcKyPYq6jaTu3TzsPa_p2YRRsjmVKjxDplBJGZkhlv-ysbPN3NEqEVna-vdH3aEPQ4hvtTl_xSeIy1P_SraKghINn3imYwJ_ndDRQnyeZq6Q8bW6bufoMSxQ7ptgwabHuDSog-n9eDr2E3Zv1BBGU0A5Of_72lGxvzm2SWoNTf7Sj4XUZvk_MgVE-o99n6QxI5tNkTr6E3mw4OJqTSjhMD4Nzi5yR2JvU_OlqJvR5HgTY4y8lZfoop_hB3QKzw_hzB4xqrGJ8AptrQnXKcHoUJIPmdTtJauBztNjW0x9D9zdXIkuu4QDSQ

Proxy is listening on port 47011
Merged "otedge001" as current context in C:\Users\sysadmin\.kube\config
Start sending kubectl requests on 'otedge001' context using kubeconfig at C:\Users\sysadmin\.kube\config
Press Ctrl+C to close proxy.
```

You can use this command on any computer as long as the Azure CLI is installed and you have authenticated to your tenant with `az login`. The command downloads the Kubernetes config file, sets the context, and creates a proxy connection through Azure Arc to the Kubernetes cluster.

![Image](img-1dfeb56e-image.png)

After the connection is established, open a new terminal window and use `kubectl` as you are used to. For example on a 

![Image](img-1dfeb56e-image.png)

It is also possible to use any dashboard to display the resources from the Kubernetes cluster. I like to use Octant from VMWare but you can use whatever dashboard you feel comfortable.

## Monitoring 

Azure Arc allows you to project your on-premises Kubernetes cluster into Azure. Doing so enables you to manage the cluster from Azure with tools such as Azure Monitor or Cloud Defender.

> 📢 From your management system
We will focus on install the Container Insights Extension which enables you to monitor your pods and nodes from the on-premise cluster in Azure.

```bash
az account set -s <SUBSCRIPTION_ID>
# Add Extenions to the CLI
az extension add --name k8s-extension
az extension add --name amg

# Add Providers to the Subscription
az provider register --namespace Microsoft.AlertsManagement
az provider register --namespace Microsoft.Monitor
az provider register --namespace Microsoft.Dashboard
az provider register --namespace Microsoft.Insights
az provider register --namespace Microsoft.OperationalInsights


# Create an Azure Monitor workspace to enable metric collection for your Azure Arc-enabled Kubernetes cluster.
# This workspace stores Prometheus data which we will be sending from our Cluster
# Note: Save the Azure Monitor workspace ID from the output of this command. 
az monitor account create --name otedge001-ws --resource-group iot-edge01 --location NorthEurope --query id -o tsv
/subscriptions/df56d048-2e20-4ab6-82b7-11643163aa53/resourcegroups/iot-edge01/providers/microsoft.monitor/accounts/otedge001-ws

# Create an Azure Managed Grafana instance to visualize your Prometheus metrics.
# Note: Save the Grafana ID from the output of this command. 
az grafana create --name otedge001-graf --resource-group iot-edge01 --location NorthEurope --query id -o tsv
/subscriptions/df56d048-2e20-4ab6-82b7-11643163aa53/resourceGroups/iot-edge01/providers/Microsoft.Dashboard/grafana/otedge001-graf

# Create a Log Analytics workspace for Container Insights.
# Note: Save the Log Analytics workspace ID from the output of this command.
az monitor log-analytics workspace create --name otedge001-la --resource-group iot-edge01 --location NorthEurope --query id -o tsv
/subscriptions/df56d048-2e20-4ab6-82b7-11643163aa53/resourceGroups/iot-edge01/providers/Microsoft.OperationalInsights/workspaces/otedge001-la
```

### Enable metrics collection for the cluster

Update the Azure Arc cluster to collect metrics and send them to the previously created Azure Monitor workspace. You also link this workspace with the Grafana instance.

This Azure CLI command creates the namespace you defined with the `–name` parameter but it is empty at first glance. It creates an *Azure Monitor Agent Deployment* and *ReplicaSet* in the `kube-system` namespace though. The newly created namespace contains a *config map* and some *secrets* to ensure a safe communication with Azure

```bash
damian@BYO-MBP-LY62L726TL ~ % az k8s-extension create --name azuremonitor-metrics --cluster-name otedge001 --resource-group iot-edge01 --cluster-type connectedClusters --extension-type Microsoft.AzureMonitor.Containers.Metrics --configuration-settings azure-monitor-workspace-resource-id=/subscriptions/df56d048-2e20-4ab6-82b7-11643163aa53/resourcegroups/iot-edge01/providers/microsoft.monitor/accounts/otedge001-ws grafana-resource-id=/subscriptions/df56d048-2e20-4ab6-82b7-11643163aa53/resourceGroups/iot-edge01/providers/Microsoft.Dashboard/grafana/otedge001-graf

Preview version of extension is disabled by default for extension installation, enabled for modules without stable versions. 
Please run 'az config set extension.dynamic_install_allow_preview=true or false' to config it specifically. 
The command requires the extension k8s-extension. Do you want to install it now? The command will continue to run after the extension is installed. (Y/n): y
Run 'az config set extension.use_dynamic_install=yes_without_prompt' to allow installing extensions without prompt.
Using Azure Monitor Workspace (stores prometheus metrics) : /subscriptions/df56d048-2e20-4ab6-82b7-11643163aa53/resourcegroups/iot-edge01/providers/microsoft.monitor/accounts/otedge001-ws

{
  "aksAssignedIdentity": null,
  "autoUpgradeMinorVersion": true,
  "configurationProtectedSettings": {},
  "configurationSettings": {
    "azure-monitor-workspace-resource-id": "/subscriptions/df56d048-2e20-4ab6-82b7-11643163aa53/resourcegroups/iot-edge01/providers/microsoft.monitor/accounts/otedge001-ws",
    "grafana-resource-id": "/subscriptions/df56d048-2e20-4ab6-82b7-11643163aa53/resourceGroups/iot-edge01/providers/Microsoft.Dashboard/grafana/otedge001-graf"
  },
  "currentVersion": "6.14.0-main-01-16-2025-8d52acfe",
  "customLocationSettings": null,
  "errorInfo": null,
  "extensionType": "microsoft.azuremonitor.containers.metrics",
  "id": "/subscriptions/df56d048-2e20-4ab6-82b7-11643163aa53/resourceGroups/iot-edge01/providers/Microsoft.Kubernetes/connectedClusters/otedge001/providers/Microsoft.KubernetesConfiguration/extensions/azuremonitor-metrics",
  "identity": {
    "principalId": "4bb5dfc8-114d-41dc-b082-89932db188ec",
    "tenantId": null,
    "type": "SystemAssigned"
  },
  "isSystemExtension": false,
  "name": "azuremonitor-metrics",
  "packageUri": null,
  "plan": null,
  "provisioningState": "Succeeded",
  "releaseTrain": "stable",
  "resourceGroup": "iot-edge01",
  "scope": {
    "cluster": {
      "releaseNamespace": "kube-system"
    },
    "namespace": null
  },
  "statuses": [],
  "systemData": {
    "createdAt": "2025-04-25T21:36:49.667510+00:00",
    "createdBy": null,
    "createdByType": null,
    "lastModifiedAt": "2025-04-25T21:36:49.667510+00:00",
    "lastModifiedBy": null,
    "lastModifiedByType": null
  },
  "type": "Microsoft.KubernetesConfiguration/extensions",
  "version": null
}
```

We should be able to see the new pods which were deployed with the following command

```bash
sysadmin@otedge001:~$ kubectl get pods -n kube-system --sort-by=.metadata.creationTimestamp | tail -n +2 | tac

ama-metrics-855cdd5bdd-c44wx                          2/2     Running     1 (12m ago)   16m
azuremonitor-metrics-prometheus-node-exporter-c8xck   1/1     Running     0             16m
ama-metrics-operator-targets-665546b7bf-xjs6n         2/2     Running     1 (15m ago)   16m
ama-metrics-node-b2l9z                                2/2     Running     1 (12m ago)   16m
ama-metrics-ksm-7fd5f48667-z8t5h                      1/1     Running     0             16m
ama-metrics-855cdd5bdd-f6jz4                          2/2     Running     1 (12m ago)   16m
traefik-67bfb46dcb-zwpnf                              1/1     Running     0             33h
svclb-traefik-3c89490b-l7wvr                          2/2     Running     0             33h
metrics-server-6f4c6675d5-7rv4s                       1/1     Running     0             33h
helm-install-traefik-fns8n                            0/1     Completed   1             33h
helm-install-traefik-crd-fqnkw                        0/1     Completed   0             33h
coredns-ff8999cc5-hlscp                               1/1     Running     0             33h
local-path-provisioner-774c6665dc-mslh9               1/1     Running     0             33h

```

### Enable Container Insights logs for logs collection.

The Azure CLI command automatically connets the  Log Analytics Workspace for the metrics and logs of the extensions.

```bash
damian@BYO-MBP-LY62L726TL ~ % az k8s-extension create --name azuremonitor-containers --cluster-name otedge001 --resource-group iot-edge01 --cluster-type connectedClusters --extension-type Microsoft.AzureMonitor.Containers --configuration-settings logAnalyticsWorkspaceResourceID=/subscriptions/df56d048-2e20-4ab6-82b7-11643163aa53/resourceGroups/iot-edge01/providers/Microsoft.OperationalInsights/workspaces/otedge001-la

Ignoring name, release-namespace and scope parameters since microsoft.azuremonitor.containers only supports cluster scope and single instance of this extension.
Defaulting to extension name 'azuremonitor-containers' and release-namespace 'azuremonitor-containers'

{
  "aksAssignedIdentity": null,
  "autoUpgradeMinorVersion": true,
  "configurationProtectedSettings": {
    "amalogs.secret.key": "",
    "amalogs.secret.wsid": "",
    "omsagent.secret.key": "",
    "omsagent.secret.wsid": ""
  },
  "configurationSettings": {
    "amalogs.useAADAuth": "true",
    "logAnalyticsWorkspaceResourceID": "/subscriptions/df56d048-2e20-4ab6-82b7-11643163aa53/resourceGroups/iot-edge01/providers/Microsoft.OperationalInsights/workspaces/otedge001-la"
  },
  "currentVersion": "3.1.26",
  "customLocationSettings": null,
  "errorInfo": null,
  "extensionType": "microsoft.azuremonitor.containers",
  "id": "/subscriptions/df56d048-2e20-4ab6-82b7-11643163aa53/resourceGroups/iot-edge01/providers/Microsoft.Kubernetes/connectedClusters/otedge001/providers/Microsoft.KubernetesConfiguration/extensions/azuremonitor-containers",
  "identity": {
    "principalId": "7e574455-82a5-476d-99de-21fb32c73701",
    "tenantId": null,
    "type": "SystemAssigned"
  },
  "isSystemExtension": false,
  "name": "azuremonitor-containers",
  "packageUri": null,
  "plan": null,
  "provisioningState": "Succeeded",
  "releaseTrain": "Stable",
  "resourceGroup": "iot-edge01",
  "scope": {
    "cluster": {
      "releaseNamespace": "azuremonitor-containers"
    },
    "namespace": null
  },
  "statuses": [],
  "systemData": {
    "createdAt": "2025-04-25T21:57:19.178480+00:00",
    "createdBy": null,
    "createdByType": null,
    "lastModifiedAt": "2025-04-25T21:57:19.178480+00:00",
    "lastModifiedBy": null,
    "lastModifiedByType": null
  },
  "type": "Microsoft.KubernetesConfiguration/extensions",
  "version": null
}
```

Once these steps are completed, you have both Azure Monitor and Grafana set up and linked to your cluster for observability and metric collection.

More importantly, after you have installed the extension, it collects metric information and sends them to Azure.

We can see these new extensions in the portal by navigating **Settings**, and then **Extensions **

![Image](img-1dfeb56e-image.png)

Or, we can use the AZ Cli to see these extensions.

```bash
# Get a list of extensions that have been installed
damian@BYO-MBP-LY62L726TL ~ % az k8s-extension show --name azuremonitor-containers --cluster-name otedge001 --resource-group iot-edge01 --cluster-type connectedClusters

{
  "aksAssignedIdentity": null,
  "autoUpgradeMinorVersion": true,
  "configurationProtectedSettings": {
    "amalogs.secret.key": "",
    "amalogs.secret.wsid": "",
    "omsagent.secret.key": "",
    "omsagent.secret.wsid": ""
  },
  "configurationSettings": {
    "amalogs.useAADAuth": "true",
    "logAnalyticsWorkspaceResourceID": "/subscriptions/df56d048-2e20-4ab6-82b7-11643163aa53/resourceGroups/iot-edge01/providers/Microsoft.OperationalInsights/workspaces/otedge001-la"
  },
  "currentVersion": "3.1.26",
  "customLocationSettings": null,
  "errorInfo": null,
  "extensionType": "microsoft.azuremonitor.containers",
  "id": "/subscriptions/df56d048-2e20-4ab6-82b7-11643163aa53/resourceGroups/iot-edge01/providers/Microsoft.Kubernetes/connectedClusters/otedge001/providers/Microsoft.KubernetesConfiguration/extensions/azuremonitor-containers",
  "identity": {
    "principalId": "7e574455-82a5-476d-99de-21fb32c73701",
    "tenantId": null,
    "type": "SystemAssigned"
  },
  "isSystemExtension": false,
  "name": "azuremonitor-containers",
  "packageUri": null,
  "plan": null,
  "provisioningState": "Succeeded",
  "releaseTrain": "Stable",
  "resourceGroup": "iot-edge01",
  "scope": {
    "cluster": {
      "releaseNamespace": "azuremonitor-containers"
    },
    "namespace": null
  },
  "statuses": [],
  "systemData": {
    "createdAt": "2025-04-25T21:57:19.178480+00:00",
    "createdBy": null,
    "createdByType": null,
    "lastModifiedAt": "2025-04-25T21:57:19.178480+00:00",
    "lastModifiedBy": null,
    "lastModifiedByType": null
  },
  "type": "Microsoft.KubernetesConfiguration/extensions",
  "version": null
}

```

### Create Dashboards in the Azure Portal

Open the Azure Arc Kubernetes Cluster in the Azure Portal and navigate to the **Monitoring** —> **Insights** pane. There you can see various dashboards already presenting realtime data. You can change what you want to display and also switch the scope, for example, from the Cluster scope to the Container scope. Additionally, you can set various filters such as a time range.

![Image](img-1dfeb56e-image.png)

For even more insight into your cluster or pods, open the Metrics pane in Azure Arc. There you can create charts and display useful information. The following screenshot shows a chart that displays the pod count and the used CPU percentage of all nodes.

![Image](img-1dfeb56e-image.png)

Another neat feature of Azure Monitor is Alerting. Go to the Alerting pane and there you can create alerts based on custom rules. For example, you could send an email to an administrator if the CPU usage of the cluster is greater than 80% over 5 minutes.

> 📢 This post is part of “Azure Arc Series - Manage an on-premises Kubernetes Cluster with Azure Arc”.
### Grafana Dashboard

After enabling Azure Monitor metrics and logs collection, the next step is to view your Kubernetes monitoring dashboards through **Azure Managed Grafana**.

1. In the Azure Portal, navigate to Resource Groups and open your resource group (e.g., iot-edge01).
1. Find and select your Grafana instance (e.g., otedge001-graf).
1. On the Grafana resource page, under the Overview section, look for the Public Endpoint URL.
1. Click on the link to open your Azure Managed Grafana dashboard in a new browser tab.
### Browse Available Dashboards

Once inside Grafana, use the left-hand menu and click **Dashboards ➔ Browse**.

You should see a wide range of **Microsoft-managed** dashboards available out of the box, including the ones in the screen shot

![Image](img-1dfeb56e-image.png)

Now, we can view these dashboards and observe out cluster in realtime, for example this is a view of the dashboard called **Kubernetes / Compute Resources / Cluster**

![Image](img-1dfeb56e-image.png)


> [!warning] ⚠️ 
> 
  ### No Data Displayed?
  
  If you open the **Overview** or any of the Kubernetes-related dashboards and **no data appears** — or you see **errors** — it typically means one of the following:
  
  * Metrics from your K3s cluster have not started flowing into Azure Monitor yet (initial ingestion delay).
  * There might be missing permissions for the Grafana instance to read Azure Monitor workspace data.
  * The Prometheus scraping configuration or Azure Monitor Metrics extension isn't fully active yet.
  > 📢 Note: It can take 5–15 minutes after setting up metrics collection before data becomes visible inside Grafana dashboards. If the issue persists, troubleshooting steps may be required.

### Verify Metrics Are Being Scraped

Ensure the Azure Monitor Metrics pods are running correctly in the `kube-system` namespace.

```bash
kubectl get pods -n kube-system | grep ama-metrics

ama-metrics-855cdd5bdd-c44wx                          2/2     Running     1 (69m ago)   72m
ama-metrics-855cdd5bdd-f6jz4                          2/2     Running     1 (69m ago)   72m
ama-metrics-ksm-7fd5f48667-z8t5h                      1/1     Running     0             72m
ama-metrics-node-b2l9z                                2/2     Running     1 (69m ago)   72m
ama-metrics-operator-targets-665546b7bf-xjs6n         2/2     Running     1 (72m ago)   72m
```

If pods are crashing (`CrashLoopBackOff`), check their logs

```bash
kubectl logs <pod-name> -n kube-system
```


# 




