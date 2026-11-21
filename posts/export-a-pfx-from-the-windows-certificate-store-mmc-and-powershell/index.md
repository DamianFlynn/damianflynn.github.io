# Export a PFX from the Windows Certificate Store (MMC and PowerShell)


# Exporting Windows Certificates to PFX

A `.pfx` file is in essence an archive which can contain multiple objects, and can also be password protected; The format of this file is known as *PKCS#12*

Typically, a `.pfx` usually contains one or more certificate, typically the chain of upstream authorities, and the corresponding private key. The most common usage of a PFX file is simplify certificate distribution to alternate systems or deployed to services.

## Logical stores

Within Windows, all certificates exist in logical storage locations referred to as **certificate stores**.

Logical stores are virtual locations that map to certificate physical paths. Powershell uses the **Cert** PSDrive to map certificates to the physical stores.

Just to keep things nice and simple, Microsoft Style *(yes I am being sarcastic)* The **Certificates** Microsoft Management Console (MMC) logical store labeling is different from the **Cert** PSDrive store labeling. The table below shows the comparison between both:

|PS CERT: Drive|	Certificates MMC|
|---|---|
|My	              |Personal
|Remote Desktop	  |Remote Desktop
|Root	            |Trusted Root Certification Authorities
|CA	              |Intermediate Certification Authorities
|AuthRoot	        |Third-Party Root Certification Authorities
|TrustedPublisher	|Trusted Publishers
|Trust	          |Enterprise Trust
|UserDS	          |Active Directory User Object


## Exporting the Certificates

This article will guide the relatively simple steps required to extract a certificate from the logical store, and create a PFX that we can use to transport the certificate to other systems. PFX support the containment of Private Keys, and should typically be password protected to assist in securing the certificate

### Windows Certificates MMC

Using the *Certificates* Snap-In the following steps will guide to exporting the certificate to a PFX file, which we can later process with the OpenSSL tools.

* Start the Microsoft Management Console > Run `mmc.exe`
* Click the **Console** menu and then click **Add/Remove Snap-in**.
	* Click the **Add** button and then choose the **certificates** snap-in and click on **Add**.
	* Select **Certificates** and click **Add**.
	* Select **Computer Account** then click **Next**.
	* Select **Local Computer** and then click **OK**.
	* Click **Close** and then click **OK**.

With the Snap in now loaded and focused on the *Local Computer Certificate Store*, we can locate a target *Certificate* to export.

* Expand the menu for **Certificates** and click on the **Personal** folder.
* Right click on the certificate that you want to export and select **All tasks** > **Export**.
* A wizard will appear - **Export Certificate**
  * Make sure you **check** the box to include the **private key**
  * You will be asked to password protect the PFX for importing
  * Continue through with this wizard until you have a `.PFX` file.

Rather simple right. You now have a `.pfx` file, which is password protected, containing your Certificate and its private key

### Powershell

The Powershell `PKI` module can be used to export or import PFX files. The following are some examples of the process

#### Export-PfxCertificate

The `Export-PfxCertificate` cmdlet exports a certificate or to a Personal Information Exchange `.pfx` file. By default, extended properties and the entire chain are exported.

To export a `.pfx` certificate a password is needed for encrypting the private key.

In the example below, we use the **Subject** property to find the certificate to be exported by selecting the certificate whose Subject value equals *myCertificate*

```powershell
$certificate = Get-ChildItem -Path Cert:\LocalMachine\My\ | Where-Object {$_.Subject -match "myCertificate"}
```

After selecting the certificate it can be exported from its store location to a folder with the command below:

```powershell
$password= "P@ssw0rd" | ConvertTo-SecureString -AsPlainText -Force
Export-PfxCertificate -Cert $certificate -FilePath $env:USERPROFILE\Documents\myCertificate.pfx -Password $password
```

#### Importing a Certificate

The Powershell Cmdlet `Import-PfxCertificate` is used to install a `.pfx` certificate.

To install a PFX certificate to the current user's personal store, use the command below:

```powershell
Import-PfxCertificate -FilePath ./PFXCertificate.pfx -CertStoreLocation Cert:\CurrentUser\My -Password P@ssw0rd 
```

To install into the system personal location change the store location in the command above from `Cert:\CurrentUser\My` to `Cert:\LocalMachine\My`.

---
<!-- enrich:containment -->
*Part of: damianflynn*

