# Azure Private Link: Delivering Services Privately (Ignite 2019)


# Azure Private Link

[MS Ignite 2019](/posts/microsoft-ignite-2019/) Session: #BRK3168
Presenters: Narayan Annamalai and Sumeet Mittal

> [!note] Generally available
> This service has exited Public Preview, and is now published to all regions as General Availability

~~Additionally today (November 2019) in US West Central, US North, and US East the ability to use with *CosmosDB* has been added to this service~~

## Your Service

Scenario, Number of VMs, linked to a Standard Load balancer. With a single click the Front End IP of the SLB, will be implemented as a Private Link, replacing the public IP with its new Private Address

* Create or Convert your existing services in Private Link Services
* VNET-VNET Connectivity
* 
To Connect to this service, we simply create a **Private Endpoint** in the VNET linked to the Private Link Endpoint.

1. Create the Service
1. Convert to Private Link Service on SLB Frontend IP
1. Share the Private Link Service ID Alias (ARM Resource ID) to the customers 
1. Create a Private Endpoint in any subnet by specify the private link service URI/Alias
1. Configure the DNS record to the price ip address
1. Act on the request o accept or reject the connection
1. Once approve the Private link is established


### Alias

To hide the hosting subscription id, and resource group id of the service being published, for security mapping, an Alias can be established which will mask the original ID - The name is established using a GUID, and some customer concatenated strings to identify the resource

### Visibility

To ensure the exposure of the service is limited, the Endpoint can be protected, even if the link name, or alias is determined; using an approval process:

* RBAC
* Subscription
* open to anyone with the link

### Auto-Approval

To support a large scale scenario for approvals, an automation can be used to set the audience which will be auto-approved.

### NAT-IP

The service provider also has the ability to Allocate a Private IP, which is translated to the Source IP. Logging is linked to the IP Allocated by the Service Provide, which is presented as the SourceIP for inbound packets

### TCP Proxy v2

Server Side Settings, including headers for Source IP of customer and Link ID of private Endpoint. Currently been testing in NGNIX to implement a new custom header for Private Link.

---
<!-- enrich:containment -->
*Part of: damianflynn*

