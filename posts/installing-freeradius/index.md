# Installing FreeRadius


# FreeRADIUS Getting Started

FreeRADIUS is an open source, high-performance, modular, scalable and feature-rich RADIUS server. It ships with both server and radius client, development libraries and numerous additional RADIUS related utilities, for Linux

FreeRADIUS supports request proxying, with fail-over and load balancing, as well as the ability to access many types of back-end databases.

RADIUS, which stands for ***R**emote **A**uthentication **D**ial-**I**n **U**ser **S**ervice*, is a network protocol used for remote user authentication and accounting. It provides AAA services; namely **A**uthorization, **A**uthentication, and **A**ccounting.

{{< series "RADIUS with Azure Active Directory" >}}

## FreeRadius

> [!note] Linux OS
> The Article is authored using **Ubuntu 18.04** as the target distribution
 
You can view versions of FreeRadius available in your distribution:

```bash
$ sudo apt policy freeradius
freeradius:
  Installed: (none)
  Candidate: 3.0.16+dfsg-1ubuntu3.1
  Version table:
 *** 3.0.16+dfsg-1ubuntu3.1 500
        500 http://azure.archive.ubuntu.com/ubuntu bionic-updates/main amd64 Packages
        500 http://security.ubuntu.com/ubuntu bionic-security/main amd64 Packages
        100 /var/lib/dpkg/status
     3.0.16+dfsg-1ubuntu3 500
        500 http://azure.archive.ubuntu.com/ubuntu bionic/main amd64 Packages
```

Install FreeRadius packages from official Ubuntu APT repository with the commands below:

```bash
sudo apt -y install freeradius freeradius-mysql freeradius-utils
```

Among the packages installed, we have the **freeradius mysql module** and **freeradius utilities** packages.

## FreeRadius 'Network Radius' Repositories

The official distributions for FreeRadius are published by **Network Radius**, and typically are fresher than the builds included with the stock Linux Distribution

> [!important] Ubuntu 18.04
> However, the **Ubuntu 18.04** version of **FreeRadius** is *3.016*, and has some issues which will essentially block our progress. We can use the official packages to deploy the current release of the service, at the time of writing this is *3.0.23*
> 
> Read more here: https://networkradius.com/packages/

### Add the **Network Radius** Repository
Add the following line to your apt source list `/etc/apt/sources.list`

For **Ubuntu Bionic 18.04**
```bash
echo "deb http://packages.networkradius.com/releases/ubuntu-bionic bionic main" | sudo tee /etc/apt/sources.list.d/networkradius.list > /dev/null
```

For **Ubuntu Focal 20.04**
```bash
echo "deb http://packages.networkradius.com/releases/ubuntu-focal focal main" | sudo tee /etc/apt/sources.list.d/networkradius.list > /dev/null
```

### Trust the Repository
Now, we need to trust this new repository, and then update the applications database, before we finally upgrade FreeRadius

```bash
curl -s 'https://packages.networkradius.com/pgp/packages%40networkradius.com' | sudo tee /etc/apt/trusted.gpg.d/packages.networkradius.com.asc > /dev/null

sudo apt-get update
```

### Install FreeRadius from **Network Radius** Repository

Now, we should be ready to Install FreeRadius packages from official Network Radius APT repository with the commands below:

```bash
sudo apt -y install freeradius freeradius-mysql freeradius-utils
```

---
<!-- enrich:containment -->
*Part of: damianflynn*

