# Web Application Gateway


Delivering PaaS Services Privately on Azure VNets with Private Link

  Mission Critical HTTP Applications, there are many things to consider

Personalised, Micro-Services, Rich Context…. To support this MS have a number of services i the Suite - Azure Frontdoor, Application Gateway, Azure CDN, Web Application Firewall, Azure Load Balancer, and Azure Traffic Manager

# Azure Application Gateway

Regional Gateway as a service

  Standard V2 SKU in GA, Currently Available in 26 regions, Builtin Zone Redundancy, Static VIP, HTTP Header/cookies insertion/modification

* Increased scale limits 20 -> 100 Listeners
* Key Vault integration and auto-renewal of SSL Certs
* AKS ingress Controller
## Autoscaling and Performance Improvements

* Grow and shrink based on app traffic requirements
* 5X better SSL offloads performance
* 500-50,000 connections/sec with RSA 2048 bit certs
* 30,000-3,000,000 persistent connections
* 2,500-250,000 reqs/sec
## Announcing General Availability:

* Frontend TLS cert integration with Azure Key Vault
* Utilized user-assigned managed identity access control for key vault
* User Certificates or secrets on key vault
* Polls every 4 hours to enable automatic cert renewal
* manual override of specific certificate version retrieval
* Manipulate Request and Response headers & cookies
  * Strip port from X-Forwarded-for header
  * Add security headers like HSTS and X-XSS-Protection
  * Common header manipulation ex HOST, SERVER
  ## AKS Ingress Control using Application Gateways

* Deployed using Helm
* Utilizes Pod-AAD for ARM authentication
* Tighter integration with AKS add on support coming
* Support URI path based, host based, SSL termination, SSL re-encryption, redirection, custom health probes, draining, cookie affinity
* Support for Lets Encrypt provide TLS certificates
* WAF fully supported with custom listener policy
* Support for multiple AKS as backend
* Support for mixed mode - both AKS and other backend types on the same Application Gateway
[**http://aka.ms/appgwaks**](https://aka.ms/appgwaks)

## Wild Card Listener

* Support for Wildcard characters in the listener host name
* Support for * and ? Characters in host name
* Associated wildcard or SAN certificates the service HTTPS enabled domains
* Send traffic to multiple tenant end points
## Diagnostics and logs enhancements

* TLS Protocol
* TLS Cipher
* Backend target server
* backend response code
* backend latency
## Metrics

* Backend response status code
* RPS healthy nodes
* End to End Latency
* Backend Latency
* Backend connect, first byte and last byte latency
## App Monitor Insights for Application Gateway

Single health and metic console for your entire cloud network No agent/configuration required

# Azure WAF - Cloud Native WEB Application Firewall

Unified WAF offering to protect your apps at network edge or region uniformly

## Public preview announced

Microsoft threats intelligence

* Protect agains automatic attacks
  * Managed good and bad bots with Azure BotManager Rule Set
  * Data is refreshed daily
  * Easy to configure in WAF policy
  * Helps increase your applications performance, by stopping aggressive crawlers.
  * Site and URI path specific WAF Policies
  * Customized WAF police at the region WAF
  * Assign different Policies to different sites
  * Site specific polices implies you can tune the WAF to suit the needs of each site independently
  * Geo filtering on regional WAF
  * Allow or Block a list of countries,
  * Support log mode
  * Rule Set for CRS 3.1 added (to be the default soon)
* Integration with Azure Sentinel
* Performance and concurrency enhancements

