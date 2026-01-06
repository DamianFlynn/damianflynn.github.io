# Updating Pester on Windows 10


I spend the majority of my time working on my Windows machines, and for many scenarios, I find it difficult to complain. However, when Windows decides to dig the boot in and not co-operative; usually is when I grab my Mac Book and get the work done.

However, running aware from the problem rarely is a good fix for the issue; My latest battle has been Pester. The testing framework builds on Powershell, and by the grace of God, now shipped as part of the Windows 10 operating system.

The issue is that the included version is 3.4 and at the time of writing the current release is 4.6. Typically, this is a non-issue a directly issuing an `Update-Module` command addresses the issue and allow the product to continue.

In the odd case we might need to revert to a push and include the `-Force` switch; but for various reasons, this sometimes also fails; which is the case in this Pester Module scenario

## The Hard Way

A little research identifies that over time, a few things have evolved with this module. In our case, the certificate used for signing the modules has changed, and for obvious reasons of security, the normal processes are failing.

To accomplish the objective in this case, I have reverted to removing the pre-installed version of pester, and then once a memory; I can proceed to deploy the newest release of this product.

Using an administrative PowerShell session, I proceed to issue the following commands; which define where the module in question is residing on my system and then assume ownership of the associated files, which I then delete. After all, Powershell modules are discovered, based on the search folder they have been installed within.

```powershell
$module = "c:\Program Files\WindowsPowerShell\Modules\Pester"
takeown /F $module /A /Ricacls $module /reset
icacls $module /grant Administrators:'F' /inheritance:d /T
Remove-Item -Path $Module -Recurse -Force -Confirm:$false
```

Now, we can put the hammer away, and proceed to deploy the module we originally required, this time without challenge.

```powershell
Install-Module -name pester -MinimumVersion 4.3.0
```

Happy Testing


