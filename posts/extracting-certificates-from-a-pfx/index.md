# Extract Public and Private Keys from a PFX with OpenSSL


# OpenSSL seperating a PFX into Public and Private Key Files

Using **OpenSSL** we can extract the private key, and the certificate into independent file's, which is required for most networking devices, and linux services.

You will need to install the [OpenSSL](/posts/build-and-install-the-latest-openssl-on-ubuntu/), package, either on your system.

## Export the private key from the PFX file

We begin, by passing in the PFX and requesting the Private key to be placed into its own file. This process will require that you provide the password which is used to protect the PFX file, and also a new password to protect the new private key file (this is not optional).

```bash
openssl pkcs12 -in filename.pfx -nocerts -out PrivateKeyWithPassword.pem
```
```output
Enter Import Password: [Input the export password of the PFX File]
MAC verified OK
Enter PEM pass phrase: [Min 5 Char New Temp Password]
```

### Remove the passphrase from the private key

The previous step created a new password protected file, which we called `PrivateKeyWithPassword.pem` that contains only the certificates private key. In many cases, we may need to use this file, without the password protection, so the following step will generate a new private key file `key.pem`

```bash
openssl rsa -in PrivateKeyWithPassword.pem -out Private.key
```
```output
Enter pass phrase for c:\temp\SSL\key.pem: [Min 5 Char New Temp Password]
writing RSA key
```

## Export the public certificate from the PFX file

The final requirement in this typical configuration is to export the public certificate as an independent file from the PFX without the private key.

Similar to the previous steps, we will provide the name of the PFX and the new certificate file, for example `cert.pem`. Again as the PFX contains the private key, you need to provide the export password to allow this process to complete.

```bash
openssl pkcs12 -in filename.pfx -clcerts -nokeys -out cert.pem
```
```output
Enter Import Password: [Input the export password of the PFX File]
MAC verified OK
```

### Exporting all cerificates in the chain

When your PFX contains all the certificates in the chain, you can also export all these to the certificate file, `cert.pem` using the following command syntax. 

```bash
openssl.exe pkcs12 -in filename.pfx -out cert.pem -nodes
```
```output
Enter Import Password: [Input the export password of the PFX File]
MAC verified OK
```

---
<!-- enrich:containment -->
*Part of: damianflynn*

