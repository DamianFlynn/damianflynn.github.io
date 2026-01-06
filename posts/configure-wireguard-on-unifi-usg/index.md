# Configure Wireguard on UniFi USG


**Install the Wireguard Package**

SSH directly to your USG, and run the following commands:

```shell
curl -L https://github.com/Lochnair/vyatta-wireguard/releases/download/0.0.20190123/wireguard-ugw3-0.0.20190702-1.deb -o /tmp/wireguard.deb
dpkg -i /tmp/wireguard.deb
```

# Create the Tunnel Secrets

To keep stuff private, we will encrypt the traffic using a long password, known as a ‘Key’. To make sure this is unique, we will use a tool provided by Wireguard to make a random key for us.

```shell
cd /config/auth
umask 077
mkdir wireguard
cd wireguard
wg genkey > wg_private.key
wg pubkey < wg_private.key > wg_public.key
```

## Configure the Tunnels

While still connected to the USG, we will now create the Interface which will be our end of the tunnel. If we consider this as a Bridge, then as we configure this interface, we will provide the address for our side and also the address of the far side.

The far side is protected from just anyone connecting to it by using another long password (key) which we need to know before we can complete this process.

In this example 192.168.33.1 is assumed to be your network, you should change these to match your network space.

```shell
# Set the USG into configuration Mode
configure
# We start, by creating a new Network space for our side of the VPN
set interfaces wireguard wg0 address 10.192.10.2/32
# Configure the Port Wireguard will be listening with
set interfaces wireguard wg0 listen-port 51820
# Allow this interface to forward the traffic over our tunnel
set interfaces wireguard wg0 route-allowed-ips true
# Now, we need to tell the interface the address of the far side of the bridge
# And also the password to allow us connect
set interfaces wireguard wg0 peer <Insert-Public-Key-Of-Peer-Here> endpoint 14.28.207.179:51820

# Now, we will tell the far side of the bridge about our network
# This is to ensure that the far side lets our network get out of the tunnel
# The sample only allows the IPs 192.168.33.101 to 192.168.33.106 to cross over
# you can choose to let everything by using the address 0.0.0.0/0
set interfaces wireguard wg0 peer <Insert-Public-Key-Of-Peer-Here> allowed-ips 10.192.10.0/32
# Lets tell the interface where to find our long password we created earlier
set interfaces wireguard wg0 private-key /config/auth/wireguard/wg_private.key
# Make the changes active, save them and exit configuration mode
commit
save
exit
```

### Firewalls block traffic

And our tunnel is no exception, so we need to allow our new Tunnel Interface to be permitted to let the traffic flow. In this case we need to let the far side of the bridge connect back to us; after all there is no point sending traffic over if nothing can come back !

```shell
# Set the USG into configuration Modeconfigure
# Configure the firewall
set firewall name WAN_LOCAL rule 20 action accept
set firewall name WAN_LOCAL rule 20 protocol udp
set firewall name WAN_LOCAL rule 20 description 'WireGuard'
set firewall name WAN_LOCAL rule 20 destination port 51820
# Make the changes active, save them and exit configuration mode
commit
save
exit
```

Afterwards dump the `config.gateway.json` and put it in the controller so it do not get overwritten

### Reconfigure after an Update

Copy your backed up `config.gateway.json` to `/var/lib/unifi/data/sites/default` on the system running the Controller (which might also be a Cloud Key).

Then through the Controller Web UI navigate to **Devices**, click on the **USG** row and then in the **Properties** window navigate to **Config > Manage Device** and click **Provision**.


