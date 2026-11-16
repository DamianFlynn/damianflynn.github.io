# ZFS - Primer


For the last number of years I have ran my home on a Dell Poweredge R620 and R510 combination, spec'ed out with lots of Disk's and RAM with almost zero issues.

These servers however turned out to be pretty dual purpose; for my befefit I learned how Azure Stack (Azure Stack HCI now!) was architected and implemented; which provided amazing insights into how Azure works, escpecially when considering Virtual Networking on both Virtual Machines and PAAS services.

For my wife, these servers essentailly removed the requirements for a tumble drier, as they kept the room at a nice toasty tempature which proved to be an excelent airing room. 

Of course that should trigger some reactions, firstly - power consumption, but also airfiltering, mainly due to the particals which turns into fluff as it is sucked in to the servers with thier amazing fans and cloggs up the flow....

SO; I finally powered both servers down, replaced the with a MUCH smaller box, and have chosen to look at software based disk management. After all Microsoft have made hugh progress with this in recent years; but then I discovered ZFS!

I should mention that these two servers have been hosting Ubuntu LTS for the last number of years, and my confort level is quite high - so I have chosen to keep Ubuntu LTS around for now.

This post is primarly a set of notes on #How-To navigate and use ZFS

## List Disks

The idea is to create a ZFS pool, the right way.

The first step is to figure out the `/dev/id-s` for the disks. The `zpool` command needs those `dev/id-s` to know which disks will be in the array. If the `/dev/sda` syntax is used instead, the pool can fail to mount after reboots randomly or after server maintence operations that change the ports/port order each disk is connected to.

While logged in over SSH with Putty to the proxmox server, type the following:

`ls /dev/disk/by-id`

## Create a Pool

zfs stuff is done using the `zfspool` command to create and manage the raw pool and `zfs` to create nested filesystems.

`zpool --help`  
`zpool status`

The create syntax is: `zpool create -f -m <mount> <pool> <type> <ids>`

-   **create**: subcommand to create the pool.
-   **-f**: Force creating the pool to bypass the “EFI label error”.
-   **-m**: The mount point of the pool. If this is not specified, then the pool will be mounted to root as /pool.
-   **pool**: This is the name of the pool.
-   **type**: mirror, raidz, raidz2, raidz3. If omitted, the default type is a stripe or raid 0.
-   **ids**: The names of the drives/partitions to include in the pool obtained from `ls /dev/disk/by-id`.
-   For 4k native disks use: `-o ashift=12`
    -   4k disk syntax: `zpool create -f -o ashift=12 -m <mount> <pool> <type> <ids>`

The zfs pool name is case sensitive; pick something memorable. “storage” mounted at `/` (root) will be used going forward.

One last thing to do before actually creating the pool. Check to see if the HDDs are advanced format drives:

```
fdisk -l | grep Units
fdisk -l | grep Sector
cat /sys/class/block/sda/queue/physical_block_size
cat /sys/class/block/sdb/queue/logical_block_size
```

Check every disk sda,sdb,sdc,sdd,sde… Do not mix 4k and non-4k drives in the same pool…but if it can’t be helped then just use `-o ashift=12`.  

Note: Some disks are 512e drives, 4k native drives that report a sector size of 512.

```
; Create a zpool with pool name "storage"
zpool create -f storage raidz2 <ids>
; Or specify a mount point
zpool create -f -m /mnt/storage storage raidz2 <ids>
; Or if using 4k native disks
zpool create -f -o ashift=12 storage raidz2 <ids>
```

The literal command entered to create the zpool should look like this for a Mirror Pool

~~~
root@hufflepuff:~# zpool create -f -o ashift=12 tank raidz1 ata-ST16000NM001G-2KK103_ZL2KMXVC ata-ST16000NM001G-2KK103_ZL2KNTJA
root@hufflepuff:~# zpool status
  pool: rpool
 state: ONLINE
config:

	NAME                                             STATE     READ WRITE CKSUM
	rpool                                            ONLINE       0     0     0
	  ata-M4-CT512M4SSD1_00000000121209086D4A-part3  ONLINE       0     0     0

errors: No known data errors

  pool: tank
 state: ONLINE
config:

	NAME                                   STATE     READ WRITE CKSUM
	tank                                   ONLINE       0     0     0
	  raidz1-0                             ONLINE       0     0     0
	    ata-ST16000NM001G-2KK103_ZL2KMXVC  ONLINE       0     0     0
	    ata-ST16000NM001G-2KK103_ZL2KNTJA  ONLINE       0     0     0

errors: No known data errors
~~~


## List Pools
So create it, and then make sure the pool exists after creating it.

~~~
root@hufflepuff:~# zpool list
NAME    SIZE  ALLOC   FREE  CKPOINT  EXPANDSZ   FRAG    CAP  DEDUP    HEALTH  ALTROOT
rpool   476G  2.37G   474G        -         -     0%     0%  1.00x    ONLINE  -
tank   29.1T   768K  29.1T        -         -     0%     0%  1.00x    ONLINE  -
root@hufflepuff:~# zpool list -v
NAME                                              SIZE  ALLOC   FREE  CKPOINT  EXPANDSZ   FRAG    CAP  DEDUP    HEALTH  ALTROOT
rpool                                             476G  2.37G   474G        -         -     0%     0%  1.00x    ONLINE  -
  ata-M4-CT512M4SSD1_00000000121209086D4A-part3   476G  2.37G   474G        -         -     0%  0.49%      -    ONLINE
tank                                             29.1T   768K  29.1T        -         -     0%     0%  1.00x    ONLINE  -
  raidz1                                         29.1T   768K  29.1T        -         -     0%  0.00%      -    ONLINE
    ata-ST16000NM001G-2KK103_ZL2KMXVC                -      -      -        -         -      -      -      -    ONLINE
    ata-ST16000NM001G-2KK103_ZL2KNTJA                -      -      -        -         -      -      -      -    ONLINE
~~~


### Pool Status
~~~
root@hufflepuff:~# zpool iostat
              capacity     operations     bandwidth
pool        alloc   free   read  write   read  write
----------  -----  -----  -----  -----  -----  -----
rpool       2.37G   474G      0     13  12.6K   316K
tank         768K  29.1T      0      4  6.13K  63.5K
----------  -----  -----  -----  -----  -----  -----
root@hufflepuff:~# zpool iostat -v
                                                   capacity     operations     bandwidth
pool                                             alloc   free   read  write   read  write
-----------------------------------------------  -----  -----  -----  -----  -----  -----
rpool                                            2.37G   474G      0     13  12.6K   316K
  ata-M4-CT512M4SSD1_00000000121209086D4A-part3  2.37G   474G      0     13  12.6K   316K
-----------------------------------------------  -----  -----  -----  -----  -----  -----
tank                                              768K  29.1T      0      4  5.75K  59.5K
  raidz1                                          768K  29.1T      0      4  5.75K  59.5K
    ata-ST16000NM001G-2KK103_ZL2KMXVC                -      -      0      2  2.87K  29.8K
    ata-ST16000NM001G-2KK103_ZL2KNTJA                -      -      0      2  2.87K  29.8K
-----------------------------------------------  -----  -----  -----  -----  -----  -----
root@hufflepuff:~#
~~~




## Add Cache Drive
you have caching drive, like an ssd, add it now by device id:

~~~
zpool add tank cache <drive-id> -f
~~~

## ZFS Compression
enabling compression makes everything faster. This should really be enabled by default.
~~~
zfs set compression=lz4 tank
~~~

## ZFS Datasets
The idea is to create a nested zfs administered file system instances for each type of data, rather than manipulate the root of the pool. This will prevent creating recursion loops and inappropriate locking when sharing or mounting data, allow setting quotas, separate operating system data from user data and improve organization.

For this example, data will be separated into storage for virtual disks and storage for static data. Static data can then be organized using more subdirectories. Do note that _containers_ can mount the static data directories directly from the Proxmox host, but _virtual machines_ will need the static data be shared over NFS.

```
zfs create tank/movies
zfs create tank/tv
zfs create tank/share/downloads
zfs set quota=1000G tank/share/downloads
zfs create storage/vmstorage
zfs create storage/vmstorage/limited
zfs set quota=1000G storage/vmstorage/limited
zfs create tank/images
zfs set mountpoint=/opt/images tank/images
zfs list
zpool status
zpool iostat -v

```

This sets a 1 TB maximum size to the `storage/vmstorage/limited` filesystem.

After creating at least one nested filesystem (recommended), subfolders can be created normally. Alternatively, these can also all be zfs administered as well.

```
ls /storage
ls /storage/share
mkdir storage/share/Software
mkdir storage/share/Backups
mkdir storage/share/Projects
mkdir storage/share/junk
ls /storage/share
```

Containers are created from templates. The templates have been downloaded locally. Proxmox needs them available server-side. One solution to this quandary is to add `/storage/share/iso` as `iso` and `container` type storage and upload the templates to that folder so Proxmox can use them.

~~~
zfs create tank/
~~~


## Sharing 

```bash
sudo apt install nfs-kernel-server
```


List the shares
```
zfs get sharesmb,sharenfs
```

Enable Share 
```
zfs set sharesmb=on tank/tv
```

Set 
```
chown backups:backupusers /tank/tv
smbpasswd -b backup
```


## NFS Server

```bash
sudo apt update && sudo apt upgrade
sudo hostnamectl set-hostname nfs-server.example.com --static
```

```bash
sudo apt -y install nfs-kernel-server
sudo systemctl enable --now nfs-server
```

Make a Share

```bash
sudo mkdir /data/nfshare
```

Export the share

On the **host** machine, open the `/etc/exports` file in your text editor with **root** privileges:

```bash
sudo nano /etc/exports
```

The file has comments showing the general structure of each configuration line. The syntax is as follows:

```/etc/exports
directory_to_share    client(share_option1,...,share_optionN)
```

You’ll need to create a line for each of the directories that you plan to share. Be sure to change the `client_ip` placeholder shown here to your actual IP address:

```/etc/exports
/var/nfs/general    client_ip(rw,sync,no_subtree_check)
/home               client_ip(rw,sync,no_root_squash,no_subtree_check)
```

Here, you’re using the same configuration options for both directories with the exception of `no_root_squash`. Take a look at what each of these options mean:

-   `rw`: This option gives the **client** computer both read and write access to the volume.
-   `sync`: This option forces NFS to write changes to disk before replying. This results in a more stable and consistent environment since the reply reflects the actual state of the remote volume. However, it also reduces the speed of file operations.
-   `no_subtree_check`: This option prevents subtree checking, which is a process where the **host** must check whether the file is actually still available in the exported tree for every request. This can cause many problems when a file is renamed while the **client** has it opened. In almost all cases, it is better to disable subtree checking.
-   `no_root_squash`: By default, NFS translates requests from a **root** user remotely into a non-privileged user on the server. This was intended as security feature to prevent a **root** account on the **client** from using the file system of the **host** as **root**. `no_root_squash` disables this behavior for certain shares.


```bash
```
Check the export

```bash
sudo exportfs -s
sudo exportfs -rav
```

Restart the NFS Server

```bash
sudo systemctl restart nfs-server
```

What is exported?

```bash
sudo showmount --exports 172.16.1.21
```

### NFS Client

I have this setup, please do the machine/folder names translation according to your case. In `/etc/exports` on server side:

```bash
/pool/music 
*(rw,sync,insecure,no_subtree_check,all_squash,anonuid=1000,anongid=1000)
```

Reload the Export

```
sudo exportfs -ra
```

#### MacOS
From client side (macOS Catalina Version 10.15.6)

```bash
sudo vi /etc/nfs.conf
nfs.client.mount.options = vers=4
```

```bash
$ sudo mount -t nfs -o resvport,rw,noowners 172.20.0.100:/pool/music /user/me/mount
```

There is a good explanation in [this post](https://serverfault.com/a/241272/407465) as "all_squash will map all UIDs and GIDs to the anonymous user, and anonuid and anongid set the UID and GID of the anonymous user.". I make it on the client side as "noowner" is to apply the current user/group as the "anonymous".

#### Linux

```bash
sudo mount -t nfs -o nfsvers=4 nfs-server:/data/nfshare /mnt
```

## Pulling it all together

Establish and verify the pool

```bash
zpool create -o ashfit=13 storage mirror sda sdb mirror sdc sdd spare sde

zpool status
zpool list
```

Create the ZFS Shares

```bash
zfs create tank/pvc-nfs
zfs list
zfs set compression=lz4 tank/pvc-nfs
zfs set atime=off tank/pvc-nfs
```

Export the  ZFS Share

```bash
zfs set sharenfs=rw.no_subtree_check,no_root_squash tank/pvc-nfs
zfs get sharenfs
```

### K8s
helm chart install

```bash
helm repo add nfs-subdir-external-provisioner https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner
helm repo update
```

Install the provisioner

```bash
helm install nfs-subdir-external-provisioner nfs-subdir-external-provisioner/nfs-subdir-external-provisioner \
  --set nfs.server=172.16.1.21 \
  --set nfs.path=/tank/pvc-nfs
```

Update the defaults

```bash
kubectl patch storageclass nfs-client -p `{"metadata": {"annotations": {"storageclass.kubernetes.io/is-default-class":"true"}}}`
```

PVC

Create the PVC

```test-pvc.yaml
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-claim
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: nfs-client
  resources:
    requests:
      storage: 128Mi
```


## ZFS File Systems

```shell
NAME           USED  AVAIL     REFER  MOUNTPOINT
tank          12.6T  1.45T     75.3G  /mnt/tank
tank/appdata  19.0G  1.45T     19.0G  /opt/appdata
tank/books     560M  1.45T      560M  /mnt/local/books
tank/devices   174G  1.45T      174G  /mnt/tank/devices
tank/feeder   51.6G  1.45T     51.6G  /mnt/feeder
tank/images   9.73G  1.45T     9.73G  /opt/images
tank/movies   3.08T  1.45T     3.08T  /mnt/local/movies
tank/music     116G  1.45T      116G  /mnt/local/music
tank/pvc-nfs   128K  1.45T      128K  /mnt/tank/pvc-nfs
tank/tv       9.13T  1.45T     9.13T  /mnt/local/tv
```

---
<!-- enrich:containment -->
*Part of: damianflynn*

