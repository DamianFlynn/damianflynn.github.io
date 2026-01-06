# IoT - NodeRED on Arc-Enabled Edge


  
  ```bash
  export KUBECONFIG=~/.kube/config
  sysadmin@otedge001:~$ kubectl get namespace
  NAME                      STATUS   AGE
  arc-workload-identity     Active   3d23h
  azure-arc                 Active   3d23h
  azure-arc-release         Active   3d23h
  azuremonitor-containers   Active   2d15h
  default                   Active   4d
  kube-node-lease           Active   4d
  kube-public               Active   4d
  kube-system               Active   4d
  ```
  
  
  # Node Red
  
  An overview of the objectives here
  
  * Local network devices (outside Kubernetes) are sending:
    * MQTT messages
    * Modbus TCP traffic
    * Your Node-RED, running inside K3s, must receive:
    * NodeRED Web Interfaces
    * MQTT subscriptions from devices
    * Modbus polling/requests from devices
    * Then Node-RED forwards processed data to:
    * Azure MQ Service inside the same K3s cluster
    Expose Node-RED to your local network by:
  
  * NodePort service to open specific ports from the edge node (otedge001) to the outside world
  
  ## Name Space 
  
  Create the Name Space
  
  ```bash
  sysadmin@otedge001:~$ kubectl create namespace nodered
  namespace/nodered created
  ```
  
  ## Presistant Storage
  
  Add a PVC (assumes you have default storage class like `local-path` from K3s) with the following manifest `node-red-pvc.yaml`:
  
  ```yaml
  ---
  apiVersion: v1
  kind: PersistentVolumeClaim
  metadata:
    name: nodered-pvc
    namespace: nodered
  spec:
    accessModes:
      - ReadWriteOnce
    resources:
      requests:
        storage: 2Gi
  ```
  
  Apply this storage
  
  ```bash
  kubectl apply -f nodered-pvc.yaml
  ```
  
  Since you’re running **K3s** (and unless you changed nything manually), by default K3s installs the `**local-path-provisioner**` as the storage backend for dynamic PVCs. That means:
  
  * Your PVC storage will physically be on the node’s local filesystem
  * Specifically under a folder like: /var/lib/rancher/k3s/storage/
  * The sub-folder names include:
    * The PVC ID (pvc-2c5110d0-82c0-42fa-99e2-fdf653bdb42c)
    * The namespace (nodered)
    * The pvc name (nodered-pvc)
    * example /var/lib/rancher/k3s/storage/pvc-<uid><namespace><pvc-name>/
    * Each PersistentVolume (PV) will have its own subdirectory inside there.
  
  ```bash
  sysadmin@otedge001:~/nodered$ kubectl get pvc -n nodered
  NAME          STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   VOLUMEATTRIBUTESCLASS   AGE
  nodered-pvc   Bound    pvc-2c5110d0-82c0-42fa-99e2-fdf653bdb42c   1Gi        RWO            local-path     <unset>                 5m15s
  ```
  
  ### Health Checking
  
  A PVC stuck in `Pending` typically means the storage provisioner can't fulfill the request. Let me help you troubleshoot this.
  
  1. Check PVC events for specific errors:
  ```bash
  kubectl describe pvc nodered-pvc -n nodered
  ```
  
  Look at the `Events:` section at the bottom—it will show why the provisioner is failing.
  
  1. Verify the local-path provisioner is running:
  ```bash
  kubectl get pods -n kube-system | grep local-path
  ```
  
  You should see a `local-path-provisioner` pod in `Running` state.
  
  1. Check the StorageClass exists and is properly configured:
  ```bash
  kubectl get storageclass local-path -o yaml
  ```
  
  ### Deployment
  
  Create the manifest for the deployment `nodered-deployment.yaml` 
  
  ```yaml
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: nodered
    namespace: nodered
    labels:
      app: nodered
  spec:
    replicas: 1
    selector:
      matchLabels:
        app: nodered
    template:
      metadata:
        labels:
          app: nodered
      spec:
        securityContext:
          fsGroup: 1000  # Ensures files are writable by node-red user
        containers:
        - name: nodered
          image: nodered/node-red:4.1.1-22
          ports:
          - containerPort: 1880
          - containerPort: 1883
          - containerPort: 502
          volumeMounts:
          - name: nodered-data
            mountPath: /data
          resources:
            requests:
              memory: "128Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
        volumes:
        - name: nodered-data
          persistentVolumeClaim:
            claimName: nodered-pvc
        initContainers:
        - name: install-azure-nodes
          image: node:18
          securityContext:
            runAsUser: 1000  # Run as same user as Node-RED
            runAsGroup: 1000
          command:
            - sh
            - -c
            - |
              npm install --prefix /data node-red-contrib-azure-iot-hub node-red-contrib-azure-blob-storage
          volumeMounts:
          - name: nodered-data
            mountPath: /data
            
            
  ```
  
  And deploy it
  
  ```yaml
  kubectl apply -f nodered-deployment.yaml
  
  # Check the Deployment is grabbing a container
  sysadmin@otedge001:~/nodered$ kubectl get pods -n nodered
  NAME                      READY   STATUS    RESTARTS   AGE
  nodered-7dc66dcdb7-hh2sg   1/1     Running   0          91s
  ```
  
  Inspect the Container to see if it is starting.
  
  In our manifest, we added an `**initContainer**` (`install-azure-nodes`). **InitContainers run first**, *before* the main container (`nodered`) starts. Until all **InitContainers** finish successfully, Kubernetes holds the Pod in `PodInitializing` state. W**hen you run **`**kubectl logs <pod>**`, it by default tries to show **the main container logs** — **but your main container hasn't even started yet**, so you get:
  
  ```bash
  # Check the container is starting
  sysadmin@otedge001:~/nodered$ kubectl logs nodered-7dc66dcdb7-hh2sg -n nodered -f
  28 Apr 13:29:41 - [info] 
  Error from server (BadRequest): container "nodered" in pod "nodered-78948ddfb4-8q4jj" is waiting to start: PodInitializing
  
  ```
  
  If we use `--container` flag to tell `kubectl` you want logs from the** init container** instead of the main container 
  
  ```bash
  # Check the container is starting looking at the initContainer
  sysadmin@otedge001:~/nodered$ kubectl logs nodered-6f867d544c-9vgkg -n nodered -c install-azure-nodes -f
  
  npm warn deprecated cryptiles@2.0.5: This version has been deprecated in accordance with the hapi support policy (hapi.im/support). Please upgrade to the latest version to get the best features, bug fixes, and security patches. If you are unable to upgrade at this time, paid support is available for older versions (hapi.im/commercial).
  npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
  npm warn deprecated sntp@1.0.9: This module moved to @hapi/sntp. Please make sure to switch over as this distribution is no longer supported and may contain bugs and critical security issues.
  npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
  npm warn deprecated crypto@0.0.3: This package is no longer supported. It's now a built-in Node module. If you've depended on crypto, you should switch to the one that's built-in.
  npm warn deprecated azure-iot-device-amqp-ws@1.0.14: The Amqp over Websockets feature is now provided by azure-iot-device-amqp.AmqpWs
  npm warn deprecated har-validator@2.0.6: this library is no longer supported
  npm warn deprecated uuid@3.4.0: Please upgrade  to version 7 or higher.  Older versions may use Math.random() in certain circumstances, which is known to be problematic.  See https://v8.dev/blog/math-random for details.
  npm warn deprecated node-uuid@1.4.8: Use uuid module instead
  npm warn deprecated boom@2.10.1: This version has been deprecated in accordance with the hapi support policy (hapi.im/support). Please upgrade to the latest version to get the best features, bug fixes, and security patches. If you are unable to upgrade at this time, paid support is available for older versions (hapi.im/commercial).
  npm warn deprecated azure-event-hubs@0.0.8: This package has been deprecated. Please use @azure/event-hubs instead
  npm warn deprecated request@2.74.0: request has been deprecated, see https://github.com/request/request/issues/3142
  npm warn deprecated hoek@2.16.3: This version has been deprecated in accordance with the hapi support policy (hapi.im/support). Please upgrade to the latest version to get the best features, bug fixes, and security patches. If you are unable to upgrade at this time, paid support is available for older versions (hapi.im/commercial).
  npm warn deprecated hawk@3.1.3: This module moved to @hapi/hawk. Please make sure to switch over as this distribution is no longer supported and may contain bugs and critical security issues.
  npm warn deprecated azure-storage@1.4.0: Please note: newer packages @azure/storage-blob, @azure/storage-queue and @azure/storage-file are available as of November 2019 and @azure/data-tables is available as of June 2021. While the legacy azure-storage package will continue to receive critical bug fixes, we strongly encourage you to upgrade. Migration guide can be found: https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/storage/MigrationGuide.md
  
  added 282 packages, and audited 283 packages in 27s
  
  17 packages are looking for funding
    run `npm fund` for details
  
  20 vulnerabilities (12 moderate, 6 high, 2 critical)
  
  To address issues that do not require attention, run:
    npm audit fix
  
  Some issues need review, and may require choosing
  a different dependency.
  
  Run `npm audit` for details.
  npm notice
  npm notice New major version of npm available! 10.8.2 -> 11.3.0
  npm notice Changelog: https://github.com/npm/cli/releases/tag/v11.3.0
  npm notice To update run: npm install -g npm@11.3.0
  npm notice
  
  ```
  
  
  
  > [!warning] ⚠️ 
  > 
    # Checking Containers Logs
    
      If your `install-azure-nodes` init container **fails**, the whole Pod will stay in `Init:Error` or `CrashLoopBackoff`, and you can troubleshoot from the init logsHere's what's happening:
    
    Once, it has started without issues, we can then inspect the main containers logs
  
  ```bash
  sysadmin@otedge001:~/nodered$ kubectl logs nodered-6f867d544c-9vgkg -n nodered 
  Defaulted container "nodered" out of: nodered, install-azure-nodes (init)
  28 Apr 15:09:42 - [info] 
  
  Welcome to Node-RED
  ===================
  
  28 Apr 15:09:42 - [info] Node-RED version: v4.0.9
  28 Apr 15:09:42 - [info] Node.js  version: v20.19.0
  28 Apr 15:09:42 - [info] Linux 6.8.0-58-generic x64 LE
  28 Apr 15:09:43 - [info] Loading palette nodes
  (node:7) [DEP0128] DeprecationWarning: Invalid 'main' field in '/data/node_modules/azure-iot-amqp-base/package.json' of 'main.js'. Please either fix that or report it to the module author
  (Use `node --trace-deprecation ...` to show where the warning was created)
  (node:7) [DEP0128] DeprecationWarning: Invalid 'main' field in '/data/node_modules/azure-iot-device-amqp-ws/node_modules/azure-iot-amqp-base/package.json' of 'main.js'. Please either fix that or report it to the module author
  (node:7) [DEP0128] DeprecationWarning: Invalid 'main' field in '/data/node_modules/azure-iot-device-amqp-ws/node_modules/azure-iot-amqp-base/package.json' of 'main.js'. Please either fix that or report it to the module author
  28 Apr 15:09:52 - [info] Settings file  : /data/settings.js
  28 Apr 15:09:52 - [info] Context store  : 'default' [module=memory]
  28 Apr 15:09:52 - [info] User directory : /data
  28 Apr 15:09:52 - [warn] Projects disabled : editorTheme.projects.enabled=false
  28 Apr 15:09:52 - [info] Flows file     : /data/flows.json
  28 Apr 15:09:52 - [info] Creating new flow file
  28 Apr 15:09:52 - [warn] 
  
  ---------------------------------------------------------------------
  Your flow credentials file is encrypted using a system-generated key.
  
  If the system-generated key is lost for any reason, your credentials
  file will not be recoverable, you will have to delete it and re-enter
  your credentials.
  
  You should set your own key using the 'credentialSecret' option in
  your settings file. Node-RED will then re-encrypt your credentials
  file using your chosen key the next time you deploy a change.
  ---------------------------------------------------------------------
  
  28 Apr 15:09:52 - [warn] Encrypted credentials not found
  28 Apr 15:09:52 - [info] Starting flows
  28 Apr 15:09:52 - [info] Started flows
  28 Apr 15:09:52 - [info] Server now running at http://127.0.0.1:1880/
  ```
  
  
  We can also inspect the PVC, to see that NodeRed has its data files created earlier using the command `sudo ls -al /var/lib/rancher/k3s/storage/pvc-2c5110d0-82c0-42fa-99e2-fdf653bdb42c_nodered_nodered-pvc`  
  
  ```bash
  # Check the PVC, use the path as described in the PVC Creation
  sysadmin@otedge001:~/nodered$ sudo ls -al /var/lib/rancher/k3s/storage/pvc-2c5110d0-82c0-42fa-99e2-fdf653bdb42c_nodered_nodered-pvc
  total 72
  drwxrwxrwx 4 root     root      4096 Apr 28 13:29 .
  drwx------ 3 root     root      4096 Apr 28 13:29 ..
  -rw-r--r-- 1 sysadmin sysadmin 14681 Apr 28 13:29 .config.nodes.json
  -rw-r--r-- 1 sysadmin sysadmin   133 Apr 28 13:29 .config.runtime.json
  -rw-r--r-- 1 sysadmin sysadmin    40 Apr 28 13:29 .config.runtime.json.backup
  drwxr-xr-x 3 sysadmin sysadmin  4096 Apr 28 13:29 lib
  drwxr-xr-x 2 sysadmin sysadmin  4096 Apr 28 13:29 node_modules
  -rw-r--r-- 1 sysadmin sysadmin   120 Apr 28 13:29 package.json
  -rw-r--r-- 1 sysadmin sysadmin 24649 Apr 28 13:29 settings.js
  ```
  
  ## Create the Service
  
  Your **Node-RED pod** is running inside the K3s cluster with IP address that's only accessible *within* the cluster (e.g., 10.42.x.x). Without a Service, nothing can reach it reliably because:
  
  * Pod IPs change when pods restart
  * Pods are isolated inside the cluster network
  The **Service** solves this by:
  
  * Stable endpoint: Creates a predictable way to reach your pod (nodered-service on 10.43.73.230)
  * Port mapping: Maps cluster-internal ports to node-level ports
  * Service discovery: Kubernetes automatically routes traffic from the Service to the correct pod(s)
  Our NodePort Configuration
  
  ```yaml
  type: NodePort
  ports:
    - name: http-ui
      port: 1880          # Port inside the cluster
      targetPort: 1880    # Port on the pod container
      nodePort: 31880     # Port exposed on the K3s node itself
  ```
  
  **What this means:**
  
  * targetPort: 1880 → Container port where Node-RED listens
  * port: 1880 → Service port inside cluster (for pod-to-pod communication)
  * nodePort: 31880 → Exposed on the node's network interface
  So traffic flow is:
  
  ```mermaid
  graph TD
    Desktop --> SSH
    SSH -->|Tunnel| NodePort(NodePort:31880)
    NodePort --> service(nodered-service:1880)
    service --> pod(nodered-pod:1880)
    
  ```
  
  
  Create a file called `nodered-service.yaml`:
  
  ```yaml
  apiVersion: v1
  kind: Service
  metadata:
    name: nodered-service
    namespace: nodered
  spec:
    selector:
      app: nodered
    type: NodePort
    ports:
    - name: http-ui
      port: 1880
      targetPort: 1880
      nodePort: 31880
    - name: mqtt
      port: 1883
      targetPort: 1883
      nodePort: 31883
    - name: modbus
      port: 502
      targetPort: 502
      nodePort: 30502
  ```
  
  Apply it:
  
  ```shell
  kubectl apply -f nodered-service.yaml
  ```
  
  * Note: If you are on a bare-metal K3s and LoadBalancer isn’t available (no MetalLB), you can change type: LoadBalancer to type: NodePort.
  Check that an IP has been assigned
  
  ```bash
  sysadmin@otedge001:~/nodered$ kubectl get svc -n nodered
  NAME              TYPE       CLUSTER-IP     EXTERNAL-IP   PORT(S)                                       AGE
  nodered-service   NodePort   10.43.73.230   <none>        1880:31880/TCP,1883:31883/TCP,502:30502/TCP   29m
  ```
  
  Great, but we have a small problem, our edge machine (`otedge001`) is behind NAT or firewalled, and therefore you **can't** reach it directly.
  
  ### Port Redirection over the SSH Tunnel
  
  Since you already SSH into the edge using:
  
  ```bash
  az ssh arc --subscription "<id>" --resource-group "<rg>" --name "<machine>" --local-user "sysadmin"
  ```
  
  You can add **port forwarding** to forward `localhost:1880` on your laptop → to the Node-RED service inside K3s.
  
  ```shell
  az ssh arc --subscription "<id>" --resource-group "<rg>" --name "<machine>" --local-user "sysadmin" 
  ```
  
  **Why this works:**
  
  * The -L 1880:localhost:31880 forwards your local port 1880 → remote machine's port 31880
  * K3s NodePort 31880 → Service → Pod port 1880
  * No firewall rules needed, no public IPs, all traffic over secure Azure Arc tunnel
  Then, **from your laptop**, open `http://localhost:1880` and you'll connect straight to Node-RED inside your K3s cluster through the Arc tunnel!
  
  ```mermaid
  flowchart TD
      A[Your Laptop] -- "Node Web 'localhost:1880'" --> B[SSH Tunnel]
      B -- "Forwarded to 31880" --> C1[otedge001 Arc-connected Edge Machine]
  
      
      subgraph NodeRed Service Namespace
        C1[otedge001 'NodePort Exposed Services']
        C1 -- "NodePort 31880" --> D1[Node-RED UI 'Port 1880']
        C1 -- "NodePort 31883" --> D2[Node-RED MQTT Input 'Port 1883']
        C1 -- "NodePort 30502" --> D3[Node-RED Modbus Input 'Port 502']
        D1 -- "Target: 1880" --> E[Node-RED Pod]
        D2 -- "Target: 1883" --> E[Node-RED Pod]
        D3 -- "Target: 502" --> E[Node-RED Pod]
      end
      
      subgraph Azure Arc Secure Channel
        A ---|Secure SSH Relay| C1
      end
  
  ```
  
  ✅ No firewall changes needed
  
  ✅ No public IPs needed
  
  # NodeRED Configuration
  
  1. Drag a "Modbus-Read" node onto the canvas from the palette (should be under the "modbus" category)
  1. Double-click the Modbus-Read node to open its configuration
  1. Configure the node:
    * Name: Read Sungrow Register
    * FC (Function Code): Select FC 4: Read Input Registers (this matches your Python code)
    * Address: 8069 (we'll use 8070 in 1-based, but Node-RED uses 0-based, so 8070-1=8069)
    * Quantity: 4 (for testing current_power which is 4 words/registers)
    * Poll Rate: Leave empty for now (we'll trigger manually first)
    1. Configure the Server/Client:
    * Click the pencil icon next to "Server" to add a new Modbus-Client configuration
    * In the new configuration window:
      * Type: TCP
      * Host: 10.13.17.11
      * Port: 502
      * Unit-Id: 247
      * Timeout: 3000 (milliseconds)
      * Reconnect: 2000 (milliseconds)
      * Name: Sungrow Logger
      * Click Add to save the client configuration
    1. Click Done to save the Modbus-Read node
  1. Add a Debug node (to see the output)
    * Drag a "debug" node from the palette
    * Connect the Modbus-Read node output to the Debug node
    * Set debug output to "complete msg object"
    1. Deploy your flow (click the Deploy button in the top right)
  This will verify the Modbus connection works before we move on.
  
  
  ```yaml
  [
      {
          "id": "72c81af4f22a3072",
          "type": "tab",
          "label": "Modbus Testing",
          "disabled": false,
          "info": "",
          "env": []
      },
      {
          "id": "7b8e035084d9be28",
          "type": "modbus-read",
          "z": "72c81af4f22a3072",
          "name": "Read Sungrow Register",
          "topic": "",
          "showStatusActivities": false,
          "logIOActivities": false,
          "showErrors": false,
          "showWarnings": true,
          "unitid": "",
          "dataType": "InputRegister",
          "adr": "8096",
          "quantity": "4",
          "rate": "60",
          "rateUnit": "s",
          "delayOnStart": false,
          "enableDeformedMessages": false,
          "startDelayTime": "",
          "server": "b2ea13c345370dd5",
          "useIOFile": false,
          "ioFile": "",
          "useIOForPayload": false,
          "emptyMsgOnFail": false,
          "x": 400,
          "y": 340,
          "wires": [
              [
                  "80159e727736d432"
              ],
              []
          ]
      },
      {
          "id": "80159e727736d432",
          "type": "debug",
          "z": "72c81af4f22a3072",
          "name": "debug 1",
          "active": true,
          "tosidebar": true,
          "console": false,
          "tostatus": false,
          "complete": "true",
          "targetType": "full",
          "statusVal": "",
          "statusType": "auto",
          "x": 640,
          "y": 340,
          "wires": []
      },
      {
          "id": "b2ea13c345370dd5",
          "type": "modbus-client",
          "name": "Sungrow Logger",
          "clienttype": "tcp",
          "bufferCommands": true,
          "stateLogEnabled": false,
          "queueLogEnabled": false,
          "failureLogEnabled": true,
          "tcpHost": "10.13.17.11",
          "tcpPort": 502,
          "tcpType": "DEFAULT",
          "serialPort": "/dev/ttyUSB",
          "serialType": "RTU-BUFFERD",
          "serialBaudrate": 9600,
          "serialDatabits": 8,
          "serialStopbits": 1,
          "serialParity": "none",
          "serialConnectionDelay": 100,
          "serialAsciiResponseStartDelimiter": "0x3A",
          "unit_id": "247",
          "commandDelay": 1,
          "clientTimeout": "3000",
          "reconnectOnTimeout": true,
          "reconnectTimeout": 2000,
          "parallelUnitIdsAllowed": true,
          "showErrors": false,
          "showWarnings": true,
          "showLogs": true
      },
      {
          "id": "7d7e622fc31ef23d",
          "type": "global-config",
          "env": [],
          "modules": {
              "node-red-contrib-modbus": "5.45.2"
          }
      }
  ]
  ```
  
  
  ## Configure MQTT Broker with TLS/SSL
  
  **Step-by-step:**
  
  1. Drag an "mqtt out" node onto the canvas (under the "network" section in the palette)
  1. Double-click the mqtt out node to configure it
  1. Click the pencil icon next to "Server" to add a new MQTT broker configuration
  1. Connection tab:
    * Server: 100.81.128.71
    * Port: 8883 (standard TLS port - adjust if yours is different)
    * Protocol: Leave as MQTT V5 or MQTT V3.1.1
    * Client ID: sungrow_nodered_bridge
    * Keep Alive: 60 seconds
    1. Security tab:
    * Username: (leave empty if not using authentication, or enter your MQTT username)
    * Password: (leave empty if not using authentication, or enter your MQTT password)
    1. Click "Enable secure (SSL/TLS) connection" checkbox - this will show additional options
  1. TLS Configuration:
    * Click the pencil icon next to "TLS Configuration" to create a new one
    * In the TLS Configuration window:
      * Name: Broker CA Certificate
      * CA Certificate: Click the upload/file button and browse to your CA certificate file on your Desktop
      * Verify server certificate: UNCHECK this box (this enables insecure mode for self-signed certs, matching MQTT_INSECURE=true in your Python)
      
      * Click Add
    1. Back in the broker configuration:
    * Name: Sungrow MQTT Broker
    * Click Add
    1. In the mqtt out node:
    * Topic: sungrow/site01/test/connection
    * QoS: 1
    * Retain: Check this box
    * Name: MQTT Test Publisher
    * Click Done
    1. Add a simple inject node with a payload of "test message" and connect it to the mqtt out node
  1. Deploy the flow
  Let me know what MQTT port you're using (8883 for TLS or another port), and then we'll test the connection!
  
  
## Create Register Definitions and Decode Logic

We'll create a **function node** that contains both the register definitions and the decode logic. This will be reusable throughout the flow.

**Step-by-step:**

1. Drag a "function" node onto the canvas
1. Double-click to open it and configure:
  * Name: Register Definitions & Decoder
  1. Copy and paste this code into the function editor:
```javascript
// Register Definitions - from Python script
const REGISTERS = {
    "current_power": {
        addr: 8070, words: 4, dtype: "U64_BE", scale: 1.0,
        desc: "Current power output (W)", topic: "power", category: "power",
        display_name: "Current Power", unit: "W"
    },
    "daily_generation": {
        addr: 8074, words: 2, dtype: "U32_LEW", scale: 0.1,
        desc: "Daily energy generation (kWh)", topic: "energy/daily", category: "energy",
        display_name: "Daily Generation", unit: "kWh"
    },
    "daily_export": {
        addr: 8090, words: 2, dtype: "U32_LEW", scale: 0.1,
        desc: "Daily export to grid (kWh)", topic: "energy/daily_export", category: "energy",
        display_name: "Daily Export", unit: "kWh"
    },
    "monthly_generation": {
        addr: 8098, words: 4, dtype: "U64_BE", scale: 0.1,
        desc: "Monthly energy generation (kWh)", topic: "energy/monthly", category: "energy",
        display_name: "Monthly Generation", unit: "kWh"
    },
    "annual_generation": {
        addr: 8102, words: 4, dtype: "U64_BE", scale: 0.1,
        desc: "Annual energy generation (kWh)", topic: "energy/annual", category: "energy",
        display_name: "Annual Generation", unit: "kWh"
    },
    "lifetime_generation": {
        addr: 8078, words: 4, dtype: "U64_BE", scale: 0.1,
        desc: "Lifetime energy generation (kWh)", topic: "energy/lifetime", category: "energy",
        display_name: "Lifetime Generation", unit: "kWh"
    },
    "apparent_power": {
        addr: 8106, words: 4, dtype: "U64_BE", scale: 1.0,
        desc: "Apparent power (VA)", topic: "power/apparent", category: "power",
        display_name: "Apparent Power", unit: "VA"
    },
    "total_export": {
        addr: 8094, words: 2, dtype: "U32_BEW", scale: 0.1,
        desc: "Total export to grid (kWh)", topic: "energy/total_export", category: "energy",
        display_name: "Total Export", unit: "kWh"
    },
    "device_type": {
        addr: 8000, words: 1, dtype: "U16", scale: 1.0,
        desc: "Device type code", topic: "device/type", category: "device",
        display_name: "Device Type", unit: ""
    },
    "protocol_version": {
        addr: 8003, words: 2, dtype: "U32_BEW", scale: 1.0,
        desc: "Protocol version", topic: "device/protocol_ver", category: "device",
        display_name: "Protocol Version", unit: ""
    }
};

// Decode register values based on data type
function decodeRegisterValue(registers, dtype) {
    const buffer = Buffer.allocUnsafe(registers.length * 2);

    // Convert registers (16-bit words) to buffer
    for (let i = 0; i < registers.length; i++) {
        buffer.writeUInt16BE(registers[i], i * 2);
    }

    let value;

    switch(dtype) {
        case "U16":
            value = buffer.readUInt16BE(0);
            break;

        case "U32_BEW":
            // Big-endian word order: [high_word, low_word]
            value = buffer.readUInt32BE(0);
            break;

        case "U32_LEW":
            // Little-endian word order: [low_word, high_word]
            value = (buffer.readUInt16BE(2) << 16) | buffer.readUInt16BE(0);
            break;

        case "U64_BE":
            // Big-endian 64-bit
            const high = buffer.readUInt32BE(0);
            const low = buffer.readUInt32BE(4);
            value = (high * 0x100000000) + low;
            break;

        default:
            throw new Error(`Unsupported data type: ${dtype}`);
    }

    return value;
}

// Store in flow context for access by other nodes
flow.set("REGISTERS", REGISTERS);
flow.set("decodeRegisterValue", decodeRegisterValue);

// Pass through the message
msg.registers = REGISTERS;
msg.decoder = decodeRegisterValue;
return msg;

```

1. Click Done
1. Connect an inject node to this function node
1. Connect a debug node to the output to verify it loads correctly
1. Deploy and click the inject button

# Building the Sungrow Flow


This flow will automatically test all registers at startup and identify which ones work. Let's build it:

**Step-by-step:**

1. Create a new tab/flow for organization:
  * Click the "+" button next to your "Modbus Testing" tab
  * Name it: Sungrow Discovery & Polling
  1. Add an inject node (for manual discovery trigger):
  * Set payload to timestamp
  * Name: Start Discovery
  1. Add a function node - "Create Register List":
  * Name: Create Register List
  * Code:
  ```javascript
// Define registers directly here for reliability
const REGISTERS = {
    "current_power": {
        addr: 8070, words: 4, dtype: "U64_BE", scale: 1.0,
        desc: "Current power output (W)", topic: "power", category: "power",
        display_name: "Current Power", unit: "W"
    },
    "daily_generation": {
        addr: 8074, words: 2, dtype: "U32_LEW", scale: 0.1,
        desc: "Daily energy generation (kWh)", topic: "energy/daily", category: "energy",
        display_name: "Daily Generation", unit: "kWh"
    },
    "daily_export": {
        addr: 8090, words: 2, dtype: "U32_LEW", scale: 0.1,
        desc: "Daily export to grid (kWh)", topic: "energy/daily_export", category: "energy",
        display_name: "Daily Export", unit: "kWh"
    },
    "monthly_generation": {
        addr: 8098, words: 4, dtype: "U64_BE", scale: 0.1,
        desc: "Monthly energy generation (kWh)", topic: "energy/monthly", category: "energy",
        display_name: "Monthly Generation", unit: "kWh"
    },
    "annual_generation": {
        addr: 8102, words: 4, dtype: "U64_BE", scale: 0.1,
        desc: "Annual energy generation (kWh)", topic: "energy/annual", category: "energy",
        display_name: "Annual Generation", unit: "kWh"
    },
    "lifetime_generation": {
        addr: 8078, words: 4, dtype: "U64_BE", scale: 0.1,
        desc: "Lifetime energy generation (kWh)", topic: "energy/lifetime", category: "energy",
        display_name: "Lifetime Generation", unit: "kWh"
    },
    "apparent_power": {
        addr: 8106, words: 4, dtype: "U64_BE", scale: 1.0,
        desc: "Apparent power (VA)", topic: "power/apparent", category: "power",
        display_name: "Apparent Power", unit: "VA"
    },
    "total_export": {
        addr: 8094, words: 2, dtype: "U32_BEW", scale: 0.1,
        desc: "Total export to grid (kWh)", topic: "energy/total_export", category: "energy",
        display_name: "Total Export", unit: "kWh"
    },
    "device_type": {
        addr: 8000, words: 1, dtype: "U16", scale: 1.0,
        desc: "Device type code", topic: "device/type", category: "device",
        display_name: "Device Type", unit: ""
    },
    "protocol_version": {
        addr: 8003, words: 2, dtype: "U32_BEW", scale: 1.0,
        desc: "Protocol version", topic: "device/protocol_ver", category: "device",
        display_name: "Protocol Version", unit: ""
    }
};

// Store in flow context
flow.set("REGISTERS", REGISTERS);

// Create array of register names to test
const registerList = Object.keys(REGISTERS);

msg.registerList = registerList;
msg.currentIndex = 0;
msg.discoveredRegisters = [];
msg.failedRegisters = [];
msg.REGISTERS = REGISTERS;

return msg;

```

1. Add a function node - "Get Next Register":
  * Name: Get Next Register
  * Code:
  ```javascript
const REGISTERS = flow.get("REGISTERS");

if (msg.currentIndex >= msg.registerList.length) {
    // Discovery complete
    msg.payload = {
        complete: true,
        discovered: msg.discoveredRegisters,
        failed: msg.failedRegisters,
        timestamp: new Date().toISOString()
    };
    return [null, msg]; // Send to output 2 (complete)
}

const regName = msg.registerList[msg.currentIndex];
const regConfig = REGISTERS[regName];

// Prepare Modbus read request
msg.payload = {
    fc: 4, // Function Code 4: Read Input Registers
    unitid: 247,
    address: regConfig.addr - 1, // Convert to 0-based
    quantity: regConfig.words
};

msg.currentRegister = regName;
msg.currentConfig = regConfig;

return [msg, null]; // Send to output 1 (read next)

```

* Add 2 outputs (click "Add output" button at bottom)
1. Look for the "Outputs" field - you should see it says 1
1. Click the "+ add output" button (or change the number from 1 to 2)
1. Click Done
You should now see **two connection points** on the right side of the "Get Next Register" node - one on top (output 1) and one below (output 2).

> The bottom output will only fire when msg.currentIndex >= msg.registerList.length (when discovery is complete), and the top output fires for each register to read.


1. Add a Modbus-Read node:
  * Important: Use Modbus-Flex-Getter instead (search for it in palette)
  * For the connection, the Top output (1) → goes to "Sungrow Logger" (for reading next register)
  
  Now we need to complete the discovery loop so it reads ALL registers, not just the first one. We need to add the logic to loop back and read the next register.

**Let's complete the discovery flow:**

1. Add a function node after "Sungrow Logger":
  * Name: Process Register Result
  * Code:
  ```javascript
// Get decoder function
const decodeRegisterValue = flow.get("decodeRegisterValue") || function(registers, dtype) {
    const buffer = Buffer.allocUnsafe(registers.length * 2);
    for (let i = 0; i < registers.length; i++) {
        buffer.writeUInt16BE(registers[i], i * 2);
    }
    let value;
    switch(dtype) {
        case "U16": value = buffer.readUInt16BE(0); break;
        case "U32_BEW": value = buffer.readUInt32BE(0); break;
        case "U32_LEW": value = (buffer.readUInt16BE(2) << 16) | buffer.readUInt16BE(0); break;
        case "U64_BE":
            const high = buffer.readUInt32BE(0);
            const low = buffer.readUInt32BE(4);
            value = (high * 0x100000000) + low;
            break;
        default: throw new Error(`Unsupported: ${dtype}`);
    }
    return value;
};

const regName = msg.currentRegister;
const regConfig = msg.currentConfig;

try {
    // Check if we got data
    if (msg.responseBuffer && msg.responseBuffer.data) {
        const registers = Array.from(msg.responseBuffer.data);
        const rawValue = decodeRegisterValue(registers, regConfig.dtype);
        const scaledValue = rawValue * regConfig.scale;

        // Add to discovered list
        msg.discoveredRegisters.push({
            name: regName,
            value: scaledValue,
            unit: regConfig.unit,
            display_name: regConfig.display_name
        });

        node.status({fill:"green", shape:"dot", text: `✓ ${regName}: ${scaledValue}${regConfig.unit}`});
    } else {
        // Failed to read
        msg.failedRegisters.push(regName);
        node.status({fill:"red", shape:"dot", text: `✗ ${regName}`});
    }
} catch(e) {
    msg.failedRegisters.push(regName);
    node.status({fill:"red", shape:"dot", text: `✗ ${regName}: ${e.message}`});
}

// Move to next register
msg.currentIndex++;

// Send back to "Get Next Register" to continue loop
return msg;

```

1. Connect the flow in a loop:
  * Sungrow Logger → Process Register Result
  * Process Register Result → back to Get Next Register (creates a loop)
  1. Add a delay node between Process Register Result and Get Next Register:
  * Name: Wait 100ms
  * Delay: 100 milliseconds
  * This prevents overwhelming the Modbus device
  1. Connect output 2 of "Get Next Register" to the "Discovery Debug" node
  * This is where the final results will appear when discovery is complete
  Here's the connection flow:

```plain text
Start Discovery → Create Register List → Get Next Register → Sungrow Logger → Process Register Result → [delay 100ms] → back to Get Next Register
                                              ↓ (output 2 when complete)
                                        Discovery Debug

```

Deploy and test! It should now loop through all 10 registers and show you which ones work.





# NodeRED Flow


```mermaid
flowchart TD
  SimulatorFlow[Simulator 'Inject fake MQTT and Modbus'] --> DeviceProcessor
  RealDevices[Real MQTT/Modbus Devices] --> DeviceProcessor

  DeviceProcessor --> DeviceRegistry[Device Registry 'flow memory']
  DeviceRegistry --> OPCUAServer[(OPC UA Server)]
  DeviceProcessor --> AzureMQ[Azure MQ Broker]

```


## Simulated Devices

Each device will send simulated data every 5 seconds., On first message arrival for a device:

* Automatically create a new OPC UA Node
* Forward data to Azure MQ Broker

  ## Flows

As part of a framework, I will establish initially 3 flows

1. The Main Flow
1. MQTT Simulator flow
1. Modbus Simulator flow
```mermaid
flowchart TB
  MQTT_Simulator["MQTT Simulator Flow (Lightbulb + Socket)"]
  Modbus_Simulator["Modbus Simulator Flow (Thermostat + Motor)"]
  
  MQTT_Simulator --> MQTTBroker
  Modbus_Simulator --> ModbusTCPServer

  RealMQTTDevices["Real MQTT Devices"] --> MQTTBroker
  RealModbusDevices["Real Modbus Devices"] --> ModbusTCPServer

  MQTTBroker --> MQTT_Receiver["Main Flow: MQTT Receiver"]
  ModbusTCPServer --> Modbus_Receiver["Main Flow: Modbus Receiver"]

  MQTT_Receiver --> DiscoveryManager["Device Discovery Manager"]
  Modbus_Receiver --> DiscoveryManager

  DiscoveryManager --> OPCUAServer["OPC UA Server (dynamic devices)"]
  DiscoveryManager --> AzureMQService["Azure MQ Broker"]

```

### Main Flow

Features of this flow include

* MQTT/Modbus listeners
* Device discovery (after 3 messages)
  * Cache first 3 telemetry messages before accepting device as "real"
  * Only then dynamically add to OPC UA
  * OPC UA node creation
* Azure MQ forwarding
* Full comments and clean structure
```yaml
// === Main Core Flow (Listener, Discovery, OPC UA, AzureMQ) ===
[
  {
    "id": "core-tab",
    "type": "tab",
    "label": "Main Core Flow",
    "disabled": false,
    "info": "Receives MQTT/Modbus messages, detects new devices after 3 messages, registers to OPC UA, forwards to Azure MQ"
  },
  {
    "id": "mqtt-in-core",
    "type": "mqtt in",
    "z": "core-tab",
    "name": "MQTT Receiver",
    "topic": "home/+/+",
    "qos": "2",
    "datatype": "auto",
    "broker": "mqtt-broker",
    "nl": false,
    "rap": false,
    "rh": 0,
    "x": 140,
    "y": 100,
    "wires": [["device-handler"]]
  },
  {
    "id": "modbus-in-core",
    "type": "function",
    "z": "core-tab",
    "name": "Modbus Receiver",
    "func": "// Simulated Modbus message arrives here from simulator
msg.topic = \"modbus/\" + msg.payload.deviceId;
return msg;",
    "x": 140,
    "y": 160,
    "wires": [["device-handler"]]
  },
  {
    "id": "device-handler",
    "type": "function",
    "z": "core-tab",
    "name": "Device Handler + Discovery",
    "func": "// Keep per-device message counters and OPC UA registration
flow.set('deviceRegistry', flow.get('deviceRegistry') || {});
let registry = flow.get('deviceRegistry');

let deviceKey = msg.topic.replace(/[^a-zA-Z0-9]/g, '_');
let device = registry[deviceKey] || { count: 0, registered: false };
device.count += 1;

// Register to OPC UA after 3 messages
if (!device.registered && device.count >= 3) {
    device.registered = true;
    node.send([null, {
        opcuaCommand: \"addVariable\",
        nodeId: \"ns=1;s=\" + deviceKey,
        datatype: \"Double\",
        value: 0
    }]);
}

registry[deviceKey] = device;
flow.set('deviceRegistry', registry);

// Send to AzureMQ and OPC UA write
let value = msg.payload.value || (msg.payload.data ? msg.payload.data[0] : msg.payload);
return [{
    topic: \"edge/devices/\" + deviceKey,
    payload: {
        deviceId: deviceKey,
        value: value,
        timestamp: Date.now()
    }
}, {
    opcuaCommand: \"write\",
    nodetype: \"variable\",
    nodeId: \"ns=1;s=\" + deviceKey,
    datatype: \"Double\",
    value: value
}];",
    "outputs": 2,
    "x": 420,
    "y": 130,
    "wires": [["mqtt-out-azure"], ["opcua-server"]]
  },
  {
    "id": "mqtt-out-azure",
    "type": "mqtt out",
    "z": "core-tab",
    "name": "Azure MQ Broker",
    "topic": "",
    "qos": "1",
    "retain": "false",
    "broker": "azure-mq-broker",
    "x": 700,
    "y": 100,
    "wires": []
  },
  {
    "id": "opcua-server",
    "type": "OpcUa-Server",
    "z": "core-tab",
    "port": "4840",
    "name": "OPC UA Server",
    "endpoint": "NodeRedOPCUA",
    "users": [],
    "allowAnonymous": true,
    "x": 700,
    "y": 160,
    "wires": [[]]
  },
  {
    "id": "mqtt-broker",
    "type": "mqtt-broker",
    "name": "Local MQTT Broker",
    "broker": "localhost",
    "port": "1883",
    "clientid": "",
    "usetls": false,
    "protocolVersion": "4",
    "keepalive": "60",
    "cleansession": true
  },
  {
    "id": "azure-mq-broker",
    "type": "mqtt-broker",
    "name": "Azure MQ Broker",
    "broker": "azure-mq-service.mq.svc.cluster.local",
    "port": "1883",
    "clientid": "",
    "usetls": false,
    "protocolVersion": "4",
    "keepalive": "60",
    "cleansession": true
  }
]

```

### MQTT Simulator

Lightbulb + Smart Socket with realistic control and ramp behavior

* Lightbulb:
  * Starts ON by default
  * Breathing brightness (30% ↔ 100%)
  * Controlled via MQTT home/lightbulb1/control
  * Smart Socket:
  * Starts ON by default
  * Power draw fluctuates (e.g., 100–200W)
  * Controlled via MQTT home/socket1/control
  * Every 5 seconds sending updates
* Full comments and structure
```yaml
[
  {
    "id": "mqtt-sim-tab",
    "type": "tab",
    "label": "MQTT Simulator Flow",
    "disabled": false,
    "info": "Simulates MQTT lightbulb and smart socket with control topics and ramping output"
  },
  {
    "id": "lightbulb-state",
    "type": "function",
    "z": "mqtt-sim-tab",
    "name": "Lightbulb State Machine",
    "func": "// Simulates lightbulb brightness ramping while ON. OFF = brightness 0.
let state = context.get('state') || { on: true, brightness: 30, direction: 1 };

if (state.on) {
    state.brightness += state.direction * 5;
    if (state.brightness >= 100 || state.brightness <= 30) {
        state.direction *= -1;
        state.brightness = Math.max(30, Math.min(100, state.brightness));
    }
} else {
    state.brightness = 0;
}

context.set('state', state);

return {
    topic: 'home/lightbulb1/brightness',
    payload: state.brightness
};",
    "outputs": 1,
    "x": 340,
    "y": 100,
    "wires": [["mqtt-out"]]
  },
  {
    "id": "lightbulb-timer",
    "type": "inject",
    "z": "mqtt-sim-tab",
    "name": "Every 5s",
    "props": [{ "p": "payload" }],
    "repeat": "5",
    "payload": "",
    "payloadType": "date",
    "x": 120,
    "y": 100,
    "wires": [["lightbulb-state"]]
  },
  {
    "id": "lightbulb-control",
    "type": "mqtt in",
    "z": "mqtt-sim-tab",
    "name": "Lightbulb Control",
    "topic": "home/lightbulb1/control",
    "qos": "2",
    "datatype": "json",
    "broker": "mqtt-broker",
    "x": 130,
    "y": 160,
    "wires": [["lightbulb-control-handler"]]
  },
  {
    "id": "lightbulb-control-handler",
    "type": "function",
    "z": "mqtt-sim-tab",
    "name": "Handle ON/OFF",
    "func": "let state = context.get('state') || { on: true };

if (msg.payload && msg.payload.state) {
    state.on = msg.payload.state.toUpperCase() === 'ON';
    context.set('state', state);
}
return null;",
    "outputs": 1,
    "x": 350,
    "y": 160,
    "wires": [[]]
  },
  {
    "id": "socket-state",
    "type": "function",
    "z": "mqtt-sim-tab",
    "name": "Socket State Machine",
    "func": "let state = context.get('state') || { on: true };
let power = 0;

if (state.on) {
    power = 100 + Math.round(Math.random() * 100); // Simulate 100–200W
}

context.set('lastPower', power);

return {
    topic: 'home/socket1/power',
    payload: power
};",
    "outputs": 1,
    "x": 340,
    "y": 260,
    "wires": [["mqtt-out"]]
  },
  {
    "id": "socket-timer",
    "type": "inject",
    "z": "mqtt-sim-tab",
    "name": "Every 5s",
    "props": [{ "p": "payload" }],
    "repeat": "5",
    "payload": "",
    "payloadType": "date",
    "x": 120,
    "y": 260,
    "wires": [["socket-state"]]
  },
  {
    "id": "socket-control",
    "type": "mqtt in",
    "z": "mqtt-sim-tab",
    "name": "Socket Control",
    "topic": "home/socket1/control",
    "qos": "2",
    "datatype": "auto",
    "broker": "mqtt-broker",
    "x": 130,
    "y": 320,
    "wires": [["socket-control-handler"]]
  },
  {
    "id": "socket-control-handler",
    "type": "function",
    "z": "mqtt-sim-tab",
    "name": "Handle ON/OFF",
    "func": "let state = context.get('state') || { on: true };
if (msg.payload === 'ON') state.on = true;
if (msg.payload === 'OFF') state.on = false;
context.set('state', state);
return null;",
    "outputs": 1,
    "x": 350,
    "y": 320,
    "wires": [[]]
  },
  {
    "id": "mqtt-out",
    "type": "mqtt out",
    "z": "mqtt-sim-tab",
    "name": "Simulator MQTT Output",
    "topic": "",
    "qos": "0",
    "retain": "false",
    "broker": "mqtt-broker",
    "x": 600,
    "y": 200,
    "wires": []
  }
]
```

### Modbus Simulator

Thermostat + Motor with realistic ramp behavior, Simulated like real Modbus devices and Injects into **Main Flow Modbus Receiver**

* Thermostat:
  * Smooth temperature drift (21–24°C)
  * Motor:
  * Smooth RPM drift (1400–1500 RPM)
  * Every 5 seconds sending updates
* Full comments and structure
```yaml
// === Modbus Simulator Flow (Thermostat + Motor, Ramp Simulation) ===
[
  {
    "id": "modbus-sim-tab",
    "type": "tab",
    "label": "Modbus Simulator Flow",
    "disabled": false,
    "info": "Simulates Modbus devices: thermostat (temperature) and motor (RPM) using function + inject"
  },
  {
    "id": "thermostat-state",
    "type": "function",
    "z": "modbus-sim-tab",
    "name": "Thermostat State Machine",
    "func": "let state = context.get('state') || { temp: 21.0, direction: 0.1 };

state.temp += state.direction;
if (state.temp >= 24.0 || state.temp <= 21.0) {
    state.direction *= -1;
    state.temp = Math.max(21.0, Math.min(24.0, state.temp));
}

context.set('state', state);

return {
    topic: 'modbus/1',
    payload: { deviceId: 1, data: [parseFloat(state.temp.toFixed(2))] }
};",
    "outputs": 1,
    "x": 350,
    "y": 100,
    "wires": [["modbus-out"]]
  },
  {
    "id": "thermostat-timer",
    "type": "inject",
    "z": "modbus-sim-tab",
    "name": "Every 5s",
    "props": [{ "p": "payload" }],
    "repeat": "5",
    "payload": "",
    "payloadType": "date",
    "x": 130,
    "y": 100,
    "wires": [["thermostat-state"]]
  },
  {
    "id": "motor-state",
    "type": "function",
    "z": "modbus-sim-tab",
    "name": "Motor RPM State Machine",
    "func": "let state = context.get('state') || { rpm: 1400, direction: 5 };

state.rpm += state.direction;
if (state.rpm >= 1500 || state.rpm <= 1400) {
    state.direction *= -1;
    state.rpm = Math.max(1400, Math.min(1500, state.rpm));
}

context.set('state', state);

return {
    topic: 'modbus/2',
    payload: { deviceId: 2, data: [state.rpm] }
};",
    "outputs": 1,
    "x": 350,
    "y": 200,
    "wires": [["modbus-out"]]
  },
  {
    "id": "motor-timer",
    "type": "inject",
    "z": "modbus-sim-tab",
    "name": "Every 5s",
    "props": [{ "p": "payload" }],
    "repeat": "5",
    "payload": "",
    "payloadType": "date",
    "x": 130,
    "y": 200,
    "wires": [["motor-state"]]
  },
  {
    "id": "modbus-out",
    "type": "function",
    "z": "modbus-sim-tab",
    "name": "Forward to Core Modbus Receiver",
    "func": "// This node simulates injection to the main Modbus handler
return msg;",
    "outputs": 1,
    "x": 640,
    "y": 150,
    "wires": [["modbus-forward"]]
  },
  {
    "id": "modbus-forward",
    "type": "link out",
    "z": "modbus-sim-tab",
    "name": "To Modbus Core",
    "links": [],
    "x": 840,
    "y": 150,
    "wires": []
  }
]

```

![Image](img-1e3eb56e-image.png)


