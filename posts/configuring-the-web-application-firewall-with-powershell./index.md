# Configuring the Web Application Firewall with PowerShell.


Microsoft Azure Application Gateway is a Layer 7 application delivery controller (ADC) offered as a service in Azure. It provides load balancing, SSL termination, end-to-end SSL, URL path-based routing, and basic web application firewall (WAF) functionality.

Working with the WAF, I usually build a basic configuration in the Portal before exporting the ARM JSON, which, then becomes my primary method to working on this service.

**Why JSON you may ask…**

  One of my biggest gripes with the Azure Firewall solutions currently is based on thier CRUD *(Create, Read, Update and Delete)* interface. It always results in a workflow from hell, training along the lines of ‘*Edit, Save,* ***WAIT,***, *Edit, Save,* ***WAIT***’ in a painful loop. What should be a fast and straightforward configuration update, typically is a process that must be executed over many hours, preferably on a second screen.
  
  **Powershell**

  While I spend a large amount of my working time sitting in VS code, with a terminal logged into Azure with both Powershell and Azure CLI, I do not every recall trying to work with the Application Gateway from this interface ever!
  
  I was asked to check the HTTP Timeout on one of the Firewalls I have access to, and send the details to a colleague; my first port of call was JSON, and then realized that this is a bit ugly for the request in hand.

A quick PowerShell command should sort this out, which of course has even more Idiosyncrasy.

# Working With Application Gateways in PowerShell

Wait for it (Remember my CRUD comment). Well, The PowerShell implementation is restricted by that same API limitations. The first step for updating any existing Gateway is to load the whole gateway configuration from Azure into a PowerShell object.

```powershell
$appGw = Get-AzApplicationGateway -Name p-ap1pub-waf01
```

From here, all the changes we make are to the PowerShell object `$appGw` until we are ready to commit the gateway back to Azure with the following command:

```powershell
Set-AzApplicationGateway -ApplicationGateway $appGw
```

## Making changes

Understanding that all configurations are going to be applied to our in-memory object `$appGw`; we can use any of the available PowerShell commandlets to alter this object, and once ready to validate we must push these changes back to Azure with the `Set-AzApplicationGateway`

> Now you will understand why I ignore this rubbish and work with the ARM JSON!

Let’s take a swift tour of working with this object to establish an end-to-end SSL listener, which would be atypical of any implemented configuration.

## Backend

### Backend Pool

The backend pool for our web servers can be created using FQDNs or IPs; I usually implement this initially using IP addresses.

```powershell
Add-AzApplicationGatewayBackendAddressPool -ApplicationGateway $appGW -Name "AppPool" -BackendIPAddresses "192.168.####101", "192.168.1.102"$appGwBackPool = Get-AzApplicationGatewayBackendAddressPool -ApplicationGateway $appGW -Name "AppPool"
```

### Backend SSL Encryption

Frequently, we establish the connection as a genuine end-to-end encrypted connection; which implies that the Web Application Gateway should have an authentication certificate, so it only forward’s traffic to a backend server if it has the expected SSL certificate.

To enable this, we must upload the public certificate used by the backend servers.

```powershell
Add-AzApplicationGatewayAuthenticationCertificate -ApplicationGateway $appGW -Name "AppPoolPublicCert" -CertificateFile ".\myAppPublicCertifcate.cer"$appGwBackPoolCert = Get-AzureRmApplicationGatewayAuthenticationCertificate -ApplicationGateway $appGW -Name "AppPoolPublicCert"
```

### Configure the Backend Service

Now, we can configure the HTTPS Protocol and authentication certificate the WAF will use to validate the backend servers.

```powershell
Add-AzApplicationGatewayBackendHttpSettings -ApplicationGateway $appGW -Name "AppPoolHTTPS" -Port 443 -Protocol Https -CookieBasedAffinity Enabled -AuthenticationCertificates $appGwBackPoolCert$appGwBackPoolHTTPS = Get-AzureRmApplicationGatewayBackendHttpSettings -ApplicationGateway $AppGW -Name "AppPoolHTTPS"
```

### Frontend

Now we can switch focus on build the frontend configuration.

### A public SSL certificate.

The certificate should be in PFX format with a password. We add this to the gateway object as follows:

```powershell
Add-AzApplicationGatewaySslCertificate -ApplicationGateway $appGw -Name "FrontCert" -CertificateFile ".\myExternalFacingCertWithPrivateKey.pfx" -Password "myP@ssw0rd!"$appGwFrontCert = Get-AzApplicationGatewaySslCertificate -ApplicationGateway $appGW -Name "FrontCert"
```

### HTTPS Port (TCP 443)

Ensure that we have TCP 443 allowed on our gateway.

```powershell
Add-AzApplicationGatewayFrontendPort -ApplicationGateway $appGw -Name "FrontHTTPS" -Port “443”
$appGwFrontPort = Get-AzApplicationGatewayFrontendPort -ApplicationGateway $appGw -Name "FrontHTTPS"
```

### IP Configuration Object

The last part of this jigsaw is the Frontend IP Configuration.

```powershell
$appGwFrontIPConfig = Get-AzApplicationGatewayFrontendIPConfig -ApplicationGateway $AppGw -Name "FrontIP"
```

### My Applications Listener

Now, we can combine the parts above to create a listener object.

```powershell
Add-AzApplicationGatewayHttpListener -ApplicationGateway $appGW -Name "appListener" -Protocol Https -FrontendIPConfiguration $appGwFrontIPConfig -FrontendPort $appGwFrontPort -HostName "fqdn.myapp.site" -RequireServerNameIndication true -SslCertificate $AppGwFrontCert$appGwListener = Get-AzureRmApplicationGatewayHttpListener -ApplicationGateway $appGW -Name "appListener"
```

### Routing Flow

Now we glue these two concepts together and build the route from the listener to the server.

```powershell
Add-AzApplicationGatewayRequestRoutingRule -ApplicationGateway $appGW -Name "AppRule" -RuleType basic -BackendHttpSettings $appGwBackPoolHTTPS -HttpListener $appGwListener -BackendAddressPool $appGwBackPool
```

### Publish

That’s - Now we publish and test to see if we got it working, or messed up.

```powershell
Set-AzApplicationGateway -ApplicationGateway $appGw
```

## Reporting Configuration

Ok, Distraction aside, we started this post, as we needed to get a quick report on all the listeners configured, including the associated timeout each has currently defined.

With the knowledge of how to work with the App Gateway in PowerShell, this request is indeed trivial to complete

```powershell
> $appGw.BackendHttpSettingsCollection | select name, port, protocol, requesttimeout
Name                             Port Protocol RequestTimeout
----                             ---- -------- --------------http_t-www.mysite.com              80 Http                 20https_t-www.mysite.com            443 Https                20
```


