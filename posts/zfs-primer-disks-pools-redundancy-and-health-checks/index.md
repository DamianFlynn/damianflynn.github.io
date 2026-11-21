# ZFS Primer: Disks, Pools, Redundancy and Health Checks


For years, my home lab ran on a Dell PowerEdge R620 and R510, both well supplied with disks and RAM. They were dependable machines and gave me plenty of room to learn about virtualisation, networking and the architecture behind Azure Stack.

They also had a second job. From my wife's point of view, I'd installed a very elaborate airing cupboard. The room stayed warm enough to dry clothes, while the server fans did an excellent job of collecting the resulting fluff.

Eventually, the heat, power consumption and dust were enough. I powered down the two servers and replaced them with a much smaller box. That prompted a fresh look at how I wanted to manage its disks, and brought me to ZFS.

These notes grew out of work on my Linux and Proxmox server. Ubuntu LTS was already familiar territory, so I wanted to understand the storage from the command line: which disks belonged to it, how the data was organised, and how to make that data available to containers and other machines.

The examples follow that process. They start with the physical disks, build a pool, divide it into datasets, then share selected datasets over the network. The Kubernetes section at the end is optional; you don't need a cluster to get useful storage out of this setup.

> **Before using the commands:** these are Linux/OpenZFS examples, with Debian/Ubuntu-style package commands and some historical output from my Proxmox host. They assume ZFS is already installed. Run administrative commands as root or with `sudo`. Replace device IDs, hostnames, addresses and paths with your own. Pool creation writes to the selected disks and can destroy existing data; none of the creation examples should be run against an existing pool or your Proxmox boot disk.

## Understand what you're building

ZFS combines storage management and a filesystem. There are a few names worth getting straight before creating anything:

- A **vdev** is a group of disks arranged as a mirror, RAIDZ group or another supported layout. Its layout determines its redundancy.
- A **pool** combines one or more vdevs into the storage you allocate from.
- A **dataset** is a filesystem within that pool, with its own properties, mount point and optional quota. Datasets can have children.
- A **zvol** is a block device backed by the pool. Proxmox can use these for VM disks; they are different from the filesystem datasets created below.

The two commands I'll use most are `zpool` for the pool and its disks, and `zfs` for datasets and their properties:

```bash
zpool --help
zpool status
```

In the examples, `tank` is the data pool. My host also had an `rpool`, which held the operating system. Keep that distinction in mind when reading the output: the data-pool instructions are not instructions to recreate `rpool`.

## Identify the disks before choosing a layout

The first job over SSH was to find the disks' persistent identifiers:

```bash
ls /dev/disk/by-id
```

Linux device names such as `/dev/sda` are convenient, but their assignment can change as hardware is moved or detected in a different order. ZFS also stores pool information on the disks, so a changed letter does not automatically mean a lost pool. Persistent IDs still make administration much clearer, particularly when identifying a disk for replacement.

Look for the whole-disk identifiers for the drives you intend to use, and match them to the physical disks. A single disk may have several identifiers. Don't mistake those aliases for separate drives, or select a `-partN` entry when you intend to use the whole disk.

Sector sizes are the next thing to check:

```bash
fdisk -l | grep Units
fdisk -l | grep Sector
cat /sys/class/block/sda/queue/physical_block_size
cat /sys/class/block/sdb/queue/logical_block_size
```

The last two commands show different properties on two example disks. Inspect both properties for every disk you're considering, substituting its current device name.

Some drives expose 512-byte logical sectors while using 4 KiB physical sectors; these are usually called 512e drives. ZFS's `ashift` property controls the minimum allocation alignment for a vdev: `ashift=12` means 2¹² bytes, or 4 KiB. `ashift=13` means 8 KiB, not a higher performance setting to choose automatically.

Use the disks' actual requirements to make that choice. Mixed sector sizes are possible, but deserve planning; setting `ashift` appropriately is something to do at creation, rather than assuming it can be adjusted easily afterwards.

## Choose redundancy, then create the pool

With two data disks, a mirror is a straightforward starting point. Each disk holds a copy, so usable capacity is roughly that of one disk. RAIDZ uses parity instead: RAIDZ1 tolerates one disk failure in its vdev, RAIDZ2 two, and RAIDZ3 three. The disk count, usable capacity and performance trade-offs differ.

Redundancy is chosen per vdev. Losing a normal data vdev can lose the whole pool, even when other vdevs are healthy. And redundancy is still not a backup: it won't undo an accidental deletion or give you another copy after the server is stolen.

The general creation syntax is:

```text
zpool create [-o ashift=12] [-m <mountpoint>] <pool> <layout> <disk-ids...>
```

Here is a two-disk mirror example using the drive IDs from my original notes. This is an example for a **new** pool, not a command to run on an existing `tank`:

```bash
zpool create -o ashift=12 -m /tank tank mirror \
  /dev/disk/by-id/ata-ST16000NM001G-2KK103_ZL2KMXVC \
  /dev/disk/by-id/ata-ST16000NM001G-2KK103_ZL2KNTJA
```

`-m /tank` sets the root dataset's mount point. Without an explicit mount point, the usual default for a pool named `tank` is `/tank`, not `/`.

For a different set of disks, these are alternative RAIDZ2 examples. Replace `<ids>` with the space-separated persistent paths for enough disks to support the layout; the angle-bracket notation is not literal shell input. Choose one layout, not all three commands:

```text
# Create a RAIDZ2 pool named storage.
zpool create storage raidz2 <ids>

# Explicitly choose its mount point.
zpool create -m /mnt/storage storage raidz2 <ids>

# Set 4 KiB alignment at creation.
zpool create -o ashift=12 storage raidz2 <ids>
```

My original commands used `-f`, for example `zpool create -f -o ashift=12 ...`. That flag forces past certain safety checks. It is not a routine fix for a label error: if ZFS objects to a disk, stop and understand why before considering an override.

### What the original server actually used

There was a misleading label in my original notes: I called this a mirror, but the command and output show a two-disk **RAIDZ1** vdev. I've kept the transcript here because it records what I actually created, rather than quietly rewriting the history:

```text
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
```

A mirror and a two-disk RAIDZ1 arrangement are not interchangeable layouts. For the two-disk starting point described above, use the mirror example rather than copying this historical command.

## Check health, capacity and activity separately

After creating a pool, I want to answer three different questions: are all its disks healthy, how much space is available, and what work is it doing?

```bash
zpool status
zpool list
zpool list -v
zpool iostat
zpool iostat -v
```

`zpool status` shows the topology, device state and read, write and checksum error counters. Look for the intended disks, an `ONLINE` state and no unexplained errors.

`zpool list` gives a capacity summary; `-v` breaks it down by vdev. The original pool reported:

```text
NAME    SIZE  ALLOC   FREE  CKPOINT  EXPANDSZ   FRAG    CAP  DEDUP    HEALTH  ALTROOT
rpool   476G  2.37G   474G        -         -     0%     0%  1.00x    ONLINE  -
tank   29.1T   768K  29.1T        -         -     0%     0%  1.00x    ONLINE  -
```

That `29.1T` is pool-level space accounting for the historical RAIDZ layout. It is not a promise of 29.1 TiB of usable file storage. Parity, metadata and reserved space affect what datasets can actually use. Check `zfs list` for dataset availability.

`zpool iostat` reports operations and bandwidth, with `-v` showing the individual devices. A single invocation gives averages since boot; for a view of current activity, use an interval:

```bash
zpool iostat -v 2
```

After the initial report, this refreshes every two seconds. Stop it with Ctrl+C.

## Create datasets around the data

Once the pool exists, it is tempting to put everything straight into `/tank`. Separate datasets make it easier to apply different quotas, mount points and sharing policies without turning every ordinary directory into its own filesystem.

Compression is a useful property to set before writing data:

```bash
zfs set compression=lz4 tank
```

Child datasets inherit this setting unless they override it. LZ4 is a sensible general-purpose choice and can reduce disk I/O for compressible data. It won't make every workload faster, and already-compressed media may shrink very little. Changing the setting does not recompress existing files automatically.

Here is a consistent version of the dataset structure from my notes:

```bash
zfs create tank/movies
zfs create tank/tv
zfs create tank/share
zfs create tank/share/downloads
zfs set quota=1000G tank/share/downloads
zfs create tank/vmstorage
zfs create tank/vmstorage/limited
zfs set quota=1000G tank/vmstorage/limited
zfs create tank/images
zfs set mountpoint=/opt/images tank/images
zfs list
```

Create the parent `tank/share` before its child `tank/share/downloads`. The download dataset has a `1000G` quota, as does `tank/vmstorage/limited`. ZFS interprets that suffix in binary units, so this is 1,000 GiB rather than exactly one decimal terabyte. A quota caps usage; it does not reserve that space in advance.

The images dataset illustrates another useful separation: its ZFS name is `tank/images`, but applications see its files at `/opt/images`. Choose an empty, appropriate target before changing a mount point, or you may hide files already present beneath it.

The `vmstorage` example is an ordinary filesystem dataset. Creating it does not register storage in Proxmox or create VM disks. Proxmox's ZFS storage backend and directory storage backend have different roles; configure the appropriate one for VM disks, ISO images or container templates.

Within a dataset, normal directories still work normally:

```bash
ls /tank
ls /tank/share
mkdir /tank/share/Software
mkdir /tank/share/Backups
mkdir /tank/share/Projects
mkdir /tank/share/junk
ls /tank/share
```

These directories share the parent dataset's properties. Create another dataset only when you need a separate boundary, such as a quota or snapshot policy.

For ISO images or container templates, a complete dataset name would be:

```bash
zfs create tank/share/iso
```

You can then add its mounted path as directory storage in Proxmox and enable the relevant content types. The incomplete `zfs create tank/` in my early notes wasn't a usable command.

### Containers and VMs access the data differently

A Proxmox container can use a host directory through a configured bind mount, subject to permissions and, for unprivileged containers, UID/GID mappings. A VM doesn't share the host's filesystem namespace. NFS or SMB provides a network route to the files; other file-sharing mechanisms are possible, but require their own configuration.

The following sections are alternatives for exposing selected data. You don't need to enable every sharing method.

## Sharing a dataset over SMB

The ZFS sharing properties are worth inspecting before making changes:

```bash
zfs get sharesmb,sharenfs
```

Where the installed OpenZFS and Samba integration supports it, the property command from my notes is:

```bash
zfs set sharesmb=on tank/tv
```

This is not the entire Samba setup. Samba must be installed and configured, users need access, and Linux distribution support for ZFS-managed SMB shares varies. An explicit Samba share pointing at the dataset's mount point may be the appropriate approach on your host.

Filesystem permissions and Samba authentication are separate pieces. For example, assuming the local user `backups` and group `backupusers` already exist:

```bash
chown backups:backupusers /tank/tv
smbpasswd -a backups
```

The first command changes ownership of the dataset's root directory, not every file underneath it. The second adds the user to Samba's password database. My original note mixed `backups` and `backup`, and used `smbpasswd -b backup`; use the intended account consistently and `-a` when adding it.

## Exporting storage over NFS

NFS was useful for making host storage available to other Linux machines and, later, Kubernetes workloads. Before configuring it, choose the actual dataset path and the clients allowed to access it.

On a Debian/Ubuntu-style host, install the server package and start the service:

```bash
sudo apt update
sudo apt install nfs-kernel-server
sudo systemctl enable --now nfs-server
```

The original preparation notes also included these commands:

```bash
sudo apt update && sudo apt upgrade
sudo hostnamectl set-hostname nfs-server.example.com --static
```

Neither a full system upgrade nor a hostname change is required just to export a dataset. Schedule upgrades separately on a working Proxmox host, and don't rename an existing Proxmox node casually, particularly if it belongs to a cluster.

For the examples below, the export is `/tank/pvc-nfs`:

```bash
zfs create tank/pvc-nfs
zfs set compression=lz4 tank/pvc-nfs
zfs set atime=off tank/pvc-nfs
zfs list
```

`atime=off` disables access-time updates on reads. That can reduce metadata writes for a file share, but check whether an application depends on access times before applying it.

There are two ways to define the export. Pick one for this dataset rather than maintaining conflicting definitions.

### Option A: manage the export in `/etc/exports`

Open the server's export configuration:

```bash
sudo nano /etc/exports
```

Each entry has this structure:

```text
directory_to_share    client(share_option1,...,share_optionN)
```

For one permitted client, replace `client_ip` with its real address:

```text
/tank/pvc-nfs    client_ip(rw,sync,no_subtree_check,root_squash)
```

`rw` allows writes, while `sync` asks the server to commit changes to stable storage before replying. `no_subtree_check` disables subtree checking, avoiding some problems with file handles when files are renamed. `root_squash` maps requests from client root to an anonymous identity instead of granting it server-root privileges.

The earlier version of these notes included `/home` with `no_root_squash`. That is a substantial trust decision, not a default to copy: it allows client root to act as root within the export. Keep root squashing unless a specific, trusted workload requires otherwise.

Apply the configuration, then inspect what the server is exporting:

```bash
sudo exportfs -rav
sudo exportfs -s
```

If service troubleshooting calls for it, you can restart NFS:

```bash
sudo systemctl restart nfs-server
```

An ordinary export change generally needs a reload with `exportfs`, not a restart. You can also query the server remotely:

```bash
sudo showmount --exports 172.16.1.21
```

`showmount` is useful, but is not a complete test for an NFSv4-only configuration. Test an actual mount from the intended client, and restrict NFS access at the firewall as well as in the export definition.

### Option B: use the ZFS NFS property

On Linux systems with the relevant NFS integration installed, ZFS can manage the export through `sharenfs`. For a client at the documentation-only example address `192.0.2.10`:

```bash
zfs set sharenfs='rw=192.0.2.10,sync,no_subtree_check,root_squash' tank/pvc-nfs
zfs get sharenfs
```

Substitute your actual client address. My old `rw.no_subtree_check,no_root_squash` example had malformed option separation and granted more privilege than a general example should. Check the resulting active export with `exportfs -s` rather than assuming a property value alone proves that clients can use it.

### Mount the export from Linux

On the client, ensure NFS client tools are installed and the target directory exists. Then mount the share:

```bash
sudo mkdir -p /mnt/nfshare
sudo mount -t nfs -o nfsvers=4 nfs-server:/tank/pvc-nfs /mnt/nfshare
```

Replace `nfs-server` with a resolvable hostname or IP address. This is a manual mount, not a persistent `/etc/fstab` entry.

The old generic example used a different server directory:

```bash
sudo mkdir -p /data/nfshare
```

If you choose that path instead, create it on the server, export it, and use it in the client mount command too. Creating a directory alone does not make it a ZFS dataset or an NFS export. Matching paths is more useful than copying a working command from a different machine.

### A macOS example from the original setup

The Mac notes came from macOS Catalina 10.15.6 and used a separate music export. The intended `/etc/exports` entry is a **single line**:

```text
/pool/music client_ip(rw,sync,insecure,no_subtree_check,all_squash,anonuid=1000,anongid=1000)
```

Here, `all_squash` maps every client's user and group IDs to the anonymous identity, with `anonuid` and `anongid` choosing UID/GID 1000. That identity must have the intended access on the server. This can suit a simple shared media directory, but removes per-user identity at the filesystem boundary. The [Server Fault explanation](https://serverfault.com/a/241272/407465) is a useful reference for those options.

The original used `*` for the client. Restrict it to the actual client or trusted subnet. `insecure` permits requests from unprivileged source ports; only retain it if needed by your client setup.

Reload the server's exports:

```bash
sudo exportfs -ra
```

On the Mac, the historical configuration edit was:

```bash
sudo vi /etc/nfs.conf
```

With this setting **inside the file**, not entered as a shell command:

```text
nfs.client.mount.options = vers=4
```

The mount command was:

```bash
sudo mkdir -p /Users/me/mount
sudo mount -t nfs -o resvport,rw,noowners 172.20.0.100:/pool/music /Users/me/mount
```

Replace the address and username. `resvport` requests a reserved source port. The client's `noowners` behaviour does not configure the server's anonymous identity; `all_squash`, `anonuid` and `anongid` do that. Treat these as historical Mac settings to check against your current macOS version.

## Optional: use the NFS dataset from Kubernetes

Once a client can mount and write to the export, Kubernetes can use it. The NFS subdirectory external provisioner creates a subdirectory on an existing export for each claim. It does not create the ZFS pool, configure NFS, or create a separate ZFS dataset per claim.

The original setup used this Helm repository:

```bash
helm repo add nfs-subdir-external-provisioner https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner
helm repo update
```

Install the provisioner with the server and export path that you have already tested:

```bash
helm install nfs-subdir-external-provisioner nfs-subdir-external-provisioner/nfs-subdir-external-provisioner \
  --set nfs.server=172.16.1.21 \
  --set nfs.path=/tank/pvc-nfs
```

All participating nodes need NFS client support and network access. Set the export directory's ownership and permissions for the identities the provisioner and workloads actually use. A write failure is a reason to inspect permissions and UID/GID mappings, not immediately disable root squashing.

This claim explicitly selects the chart's usual `nfs-client` StorageClass. Save it as `test-pvc.yaml`:

```yaml
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

Apply it and inspect the result:

```bash
kubectl apply -f test-pvc.yaml
kubectl get pvc test-claim
```

The requested `128Mi` does not, by itself, enforce a 128 MiB limit on a subdirectory of the NFS export. That differs from the ZFS dataset quotas used earlier.

If you deliberately want this StorageClass to become the cluster default, the correctly quoted patch is:

```bash
kubectl patch storageclass nfs-client -p '{"metadata":{"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

Check existing defaults first. This is a cluster-wide choice for claims that omit a StorageClass, not a required step for the explicit claim above. The backticks in my original command would have caused shell command substitution rather than passing the JSON as intended.

## Optional: cache devices and larger layouts

Two commands in the original notes deserve to sit outside the basic setup, because neither is required to get a working pool.

An SSD can be added as an L2ARC read-cache device:

```text
zpool add tank cache <drive-id>
```

Replace `<drive-id>` with the intended persistent device path. This writes to the chosen cache device; inspect it as carefully as the data disks. The original command included `-f`, which should not be a routine addition here either.

L2ARC is a secondary read cache, not extra usable pool capacity and not a write cache. It also has memory overhead. Measure your workload before assuming an SSD cache will improve it; a media library doing mostly sequential reads may see little benefit.

For a larger **new** pool, the earlier notes also sketched two mirrored vdevs and a spare. Here is the corrected `ashift` spelling and persistent-path form:

```text
zpool create -o ashift=12 storage \
  mirror /dev/disk/by-id/<disk-a> /dev/disk/by-id/<disk-b> \
  mirror /dev/disk/by-id/<disk-c> /dev/disk/by-id/<disk-d> \
  spare /dev/disk/by-id/<disk-e>

zpool status
zpool list
```

This is an alternative design, not an extra command to run after creating `tank`. Each mirror provides redundancy within its own vdev. The spare is available as a replacement device; it does not add normal data capacity or turn the whole arrangement into a higher-parity RAIDZ group.

## What the organisation looked like in practice

A later `zfs list` from my server shows why I found datasets useful. These are historical paths and sizes, not the output of following every example above:

```text
NAME          USED   AVAIL   REFER   MOUNTPOINT
tank          12.6T  1.45T   75.3G   /mnt/tank
tank/appdata  19.0G  1.45T   19.0G   /opt/appdata
tank/books     560M  1.45T    560M   /mnt/local/books
tank/devices   174G  1.45T    174G   /mnt/tank/devices
tank/feeder   51.6G  1.45T   51.6G   /mnt/feeder
tank/images   9.73G  1.45T   9.73G   /opt/images
tank/movies   3.08T  1.45T   3.08T   /mnt/local/movies
tank/music     116G  1.45T    116G   /mnt/local/music
tank/pvc-nfs   128K  1.45T    128K   /mnt/tank/pvc-nfs
tank/tv       9.13T  1.45T   9.13T   /mnt/local/tv
```

The datasets all draw from the pool, while their mount points suit the applications using them. The repeated `AVAIL` value is shared availability, not a separate allocation of 1.45T to each dataset.

For my smaller home server, this gave me a way to keep application data, media and shared storage organised without fixing each one into a separate disk partition. It also left me with a few useful commands to return to: `zpool status` for health, `zpool iostat` for activity, and `zfs list` for the filesystems consuming the space.

Before trusting important data to a setup like this, arrange regular scrubs, health alerts and backups to another system, then test a restore. Pool redundancy helps with disk failures; recovery still needs a copy that survives losing this server.

---
<!-- enrich:containment -->
*Part of: damianflynn*

