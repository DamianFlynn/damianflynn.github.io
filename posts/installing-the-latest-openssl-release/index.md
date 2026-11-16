# Installing the Latest OpenSSL release


# Installing the Latest OpenSSL release on Ubuntu

Being over 25 years old, OpenSSL can be found on just about any system you work with today; but this does not imply that the version installed is current (or even close).

During its life, there have been many instances where OpenSSL has been in the news, where some new vulnerability has being discovered, and quickly after, patched.

The Swiss Army Knive of SSL Certificate's, this is a tool that everyone should have at least used once in their administrative duties.

To check if OpenSSL is on your system, and more importantly, the version installed, we can use the following simple command.

```bash
openssl version
```

In my case “OpenSSL 1.1.1 ” was the result.

## Installing the Current Release

We will go directly to the [OpenSSL](https://openssl.org) distribution source, and download the current stable version, which at the time of writing is now **openssl-1.1.1k**  and save it into `~/Downloads` directory:

```bash
cd ~/Downloads
wget https://www.openssl.org/source/openssl-1.1.1k.tar.gz
```

### Create Working Folder

We will install the new version at `/opt/openssl`. To do that we need to create and change directory

```bash
sudo mkdir /opt/openssl
cd /opt/openssl
```

Extract the downloaded compressed file into this directory:

```bash
sudo tar xfzv ~/Downloads/openssl-1.1.1k.tar.gz --directory /opt/openssl
cd /opt/openssl
```

## Configure the Build

Before we proceed to compile the utility, we first must set some of the configuration settings, which will be used to let OpenSSL know where it is to be installed, and what folder it can use for its working space. 

The is quite trivial, as we use the provide `config` script and pass in the parameters required. We are running this with *sudo* to ensure the script can check the system for dependencies and create any folders necessary.

The folders I will be using for the installation include
* `/opt/openssl` as the home directory and 
* `/opt/openssl/ssl` as the directory where OpenSSL will store certificates and private keys.

```bash
sudo ./config --prefix=/opt/openssl --openssldir=/opt/openssl/ssl 
```

## Building and Installing OpenSSL

With the configuration complete, we now can use the *Makefile* which has just being customized, to build, and then install the new version of OpenSSL. Depending on the speed of your system this can take some time to complete.

```bash
sudo make 
sudo make install
```

Congratulations, OpenSSL current version is installed. 

## Multiple Instances

Wait - we do have a small issue. Right now there are two installations of OpenSSL on your system:

* The original installation
* and this New Current release we built from source.

## Swapping the Binaries

I won’t delete the original version, instead I will simply rename it to *openssl.old*, keeping this in the original installation path location.

```bash
sudo mv /usr/bin/openssl /usr/bin/openssl.old 
```

> [!important] Compatability
>  In the literature there are references to applications that expect openssl to be at the original directory. To maintain compatibility, and avoiding the need to alter the environment variable PATH, we will create a symbolic link `/usr/bin/openssl` pointing to `/opt/openssl/bin/openssl`

We simply link the new build to the original folder, as follows:
```bash
sudo ln -s /opt/openssl/bin/openssl /usr/bin/openssl
ls -lisah /usr/bin/openssl
```

The `ls` command above, just offers up a view to ensure that the symbolic link was established from the original path to our new installation.

## Setting the Module Library

> [!important] OpenSSL
> OpenSSL is a dependency for a lot of different applications, therefore we should complete the installation, by updating the module library configuration to ensure any application we deploy will find and use this release.

Modify the module loader configuration in `/etc/ld.so.conf.d/openssl.conf`, open the file and edit it using `vi /etc/ld.so.conf.d/openssl.conf` so that it reads as follows

```ini
/opt/openssl/lib
```

Now, reload the modules

```bash
sudo ldconfig 
```

### Sanity Check

And finally, we can verify that everything is correct 

```bash
which openssl
openssl version
openssl
```

## Clean up

Reboot your system to make things permanent and execute the last three commands again, targeting, obviously, the same outcome.

By now you have OpenSSL new version installed and working correctly. But if you try to download any of the previous files, for instance `openssl-1.1.1k.tar.gz`, you will get the following error:

```error
The Certificate Authority “Let’s Encrypt Authority X3” that issued the server certificate is not in OpenSSL certificate and private key directory */opt/openssl/ssl*.
```

If this is the desired behavior skip what follows and you have **OpenSSL 1.1.1k** completely installed.

If this is not your desired behavior, you can copy all certificates in `/etc/ssl/certs/` to `/opt/openssl/ssl/certs`. However I prefer a slightly different approach, simply linking by making `/opt/openssl/ssl/certs` a symbolic link pointing `/etc/ssl/certs/` files.

To Implement the preferred approach, issue the following command

```bash
sudo ln -s /etc/ssl/certs/. /opt/openssl/ssl/certs/
```

---
<!-- enrich:containment -->
*Part of: damianflynn*

