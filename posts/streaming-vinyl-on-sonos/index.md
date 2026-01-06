# Streaming Vinyl On Sonos


**Mixup some Vyinl Oldies, a little Ice to cast, and a PI for some energy, and your ready to go**

A little known trivia - I was once a Disc Jokey, and spent a lot of my youth behind the decks, in clubs around the West Of Ireland. Today, I still am the proud owner of a very large collection of Vynil and CD music, which of course deserves to get a second life with my digital streaming audio system powered by Sonos

# USB Turntable Streamer

I own a really nice turntable which is modeled on the Legendary Technical SL1200 MK3, which I am so well aquatinted with, including the awesome Citronix DJ Console which was home to 2 of these beauties in so many clubs way back when…

My [Audio-Technica AT-LP120-USB](http://amzn.to/2drytFC) device is the focus of todays IoT challange, I will be using a Raspberry PI3, to stream audio from one of these turntables with USB audio codec output.

If your in the market, these are also workable options for this exercise

* Audio-Technica AT-LP60-USB
* ION Audio Classic LP | 3-Speed USB
* Sony PSLX300USB
## Enable SSH before booting

Because we are going to use the Raspberry Pi headless (without a display) and without keyboard attached, we need a way to control the device. Luckily we can enable SSH by adding an *empty file* called `ssh` to the root of the SD card. This will enable SSH for us automatically. If you are using the Ethernet port on the Raspberry Pi, networking and SSH should work out of the box with DHCP.

## Update to Current OS

Update your Raspbian install:

```bash
sudo apt-get update
```

## Connect the USB Turntable to the Raspberry Pi

Now, connect the turntable to the Raspberry Pi, using USB. You can use the command `arecord -l` to check if your device has been detected. Mine shows this:

```bash
pi@raspberrypi:~ $ arecord -l
**** List of CAPTURE Hardware Devices ****
card 1: CODEC [USB AUDIO  CODEC], device 0: USB Audio [USB Audio]
  Subdevices: 0/1
  Subdevice #0: subdevice #0
```

Make a note of the card number, *1 in my case*. This is probably the same for you, but if it differs, you may need to remember it and change accordingly in the following steps.

### Fix volume issues

As most USB turntables do not have hardware volume control, and the input volume is stuck on roughly half of what it should be, we need to add a software volume control. Create the file `/etc/asound.conf` and edit it to add the following contents:

```json
pcm.dmic_hw {
    type hw
    card 1
    channels 2
    format S16_LE
}
pcm.dmic_mm {
    type mmap_emul
    slave.pcm dmic_hw
}
pcm.dmic_sv {
    type softvol
    slave.pcm dmic_hw
    control {
        name "Boost Capture Volume"
        card 1
    }
    min_dB -5.0
    max_dB 20.0
}
```

Next, run this command to refresh the alsa state and also show VU Meters to test the input volume:

```bash
arecord -D dmic_sv -r 44100 -f S16_LE -c 2 --vumeter=stereo /dev/null
```

As you might notice, the volume is way too low. You can use `alsamixer` to change the volume. Press `F6` to select the USB Turntable device, and press `TAB` until you see the boost slider.

I have it set to 65 on my setup, but you might try out. Make sure you are not turning it up too high, or your sound quality might degrade due to clipping.

## icecast2

Now, to stream we will use the `icecast2` package, which of course needs to be deployed to our Pi.

```bash
sudo apt-get install icecast2
```

### Configure icecast2

Next, we will edit `/etc/icecast2/icecast.xml`, which is the casting servers settings, to provide a name for the stream, and some credential’s to protect the stream.

```xml
<icecast>

    <location>Record Room</location>
    <admin>icemaster@localhost</admin>

    <limits>
        <clients>100</clients>
        <sources>2</sources>
        <queue-size>524288</queue-size>
        <client-timeout>30</client-timeout>
        <header-timeout>15</header-timeout>
        <source-timeout>10</source-timeout>
        <burst-on-connect>0</burst-on-connect>
        <burst-size>65535</burst-size>
    </limits>

    <authentication>
        <source-password>vynil</source-password>
        <relay-password>vynil</relay-password>

        <!-- Admin logs in with the username given below -->
        <admin-user>admin</admin-user>
        <admin-password>vynil</admin-password>
    </authentication>


    <hostname>localhost</hostname>

    <listen-socket>
        <port>80</port>
    </listen-socket>

    <http-headers>
        <header name="Access-Control-Allow-Origin" value="*" />
    </http-headers>


    <fileserve>1</fileserve>

    <paths>
        <basedir>/usr/share/icecast2</basedir>

        <logdir>/var/log/icecast2</logdir>
        <webroot>/usr/share/icecast2/web</webroot>
        <adminroot>/usr/share/icecast2/admin</adminroot>
        <alias source="/" destination="/status.xsl"/>
        <!-- The certificate file needs to contain both public and private part.
             Both should be PEM encoded.
        <ssl-certificate>/usr/share/icecast2/icecast.pem</ssl-certificate>
        -->
    </paths>

    <logging>
        <accesslog>access.log</accesslog>
        <errorlog>error.log</errorlog>
        <loglevel>3</loglevel> <!-- 4 Debug, 3 Info, 2 Warn, 1 Error -->
        <logsize>10000</logsize> <!-- Max size of a logfile -->
    </logging>

    <security>
        <chroot>0</chroot>
    </security>
</icecast>
```

### Starting IceCast2

We are going to start the casting server, but we will bing to TCP 80, which requires that we allow this to happen, but following these simple steps.

```bash
sudo setcap 'cap_net_bind_service=+ep' `which icecast2`

update-rc.d icecast2 defaults
systemctl status icecast2.service
```

### Icecast2 admin

Now, we should have the casting server online, and working, It will be listening at [http:\\Pi](http://pi-ipaddress/) *(replacing PI with the IP or name you assigned to the device)* and is good for checking the status of connected clients, authenticate with the account *admin* and password *vynil*

## Darkice

Now we need to link the USB audio source, to our Icecast server, and to make this work, we will use another grate package called `darkice`

Then install a bunch of needed packages:

```bash
sudo apt-get -y install darkice
```

### Configure Darkice

This time, we will update the DarkIce configuration file located at `/etc/darkice.cfg` so that it is aware of where the USB turntable is connected to our system (remember the pointer earlier), and how to connect with our Icecast server.

```yaml
# this section describes general aspects of the live streaming session
[general]
duration        = 0         # duration of encoding, in seconds. 0 means forever
bufferSecs      = 1         # size of internal slip buffer, in seconds
reconnect       = yes       # reconnect to the server(s) if disconnected
realtime        = yes       # run the encoder with POSIX realtime priority
rtprio          = 3         # scheduling priority for the realtime threads

# this section describes the audio input that will be streamed
[input]
device          = hw:1,0    # OSS DSP soundcard device for the audio input
sampleRate      = 44100     # other settings have crackling audo, esp. 44100
bitsPerSample   = 16        # bits per sample. try 16
channel         = 2         # channels. 1 = mono, 2 = stereo

# this section describes a streaming connection to an IceCast2 server
# there may be up to 8 of these sections, named [icecast2-0] ... [icecast2-7]
# these can be mixed with [icecast-x] and [shoutcast-x] sections
[icecast2-0]
bitrateMode     = cbr
format          = mp3
bitrate         = 320
server          = localhost
port            = 80
password        = vynil
mountPoint      = listen.mp3
name            = Turntable
description     = Audio-Technica AT-LP120 Turntable
url             = http://turntable
genre           = vinyl
public          = no
localDumpFile   = recording.m4a
```

### Darkice Init Script

Ok, we now need to create a simple script which will autostart this darkice service each time the Pi is rebooted, so that we can set and forget about this little IoT solution.

Start by creating a new *init.d* file called `/etc/init.d/darkice` and then populating the file with the following script

```bash
#!/bin/sh
#
# Copyright (c) 2007 Javier Fernandez-Sanguino <jfs@debian.org>
# Copyright (c) 2009 Jochen Friedrich <jochen@scram.de>
#
# This is free software; you may redistribute it and/or modify
# it under the terms of the GNU General Public License as
# published by the Free Software Foundation; either version 2,
# or (at your option) any later version.
#
# This is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License with
# the Debian operating system, in /usr/share/common-licenses/GPL;  if
# not, write to the Free Software Foundation, Inc., 59 Temple Place,
# Suite 330, Boston, MA 02111-1307 USA
#
### BEGIN INIT INFO
# Provides:          darkice
# Required-Start:    $network $local_fs $remote_fs
# Required-Stop:     $network $local_fs $remote_fs
# Should-Start:
# Should-Stop:
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: Live audio streamer
# Description:       DarkIce is an IceCast, IceCast2 and ShoutCast
#                    live audio streamer.
### END INIT INFO

PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

NAME=darkice
DAEMON=/usr/bin/$NAME
DESC="Live audio streamer"
LOGDIR=/var/log
USER=nobody
GROUP=nogroup
LOGFILE="$LOGDIR/$NAME.log"

PIDFILE=/var/run/$NAME.pid

test -x $DAEMON || exit 0

. /lib/lsb/init-functions

# Default options, these can be overriden by the information
# at /etc/default/$NAME
DAEMON_OPTS=""          # Additional options given to the server

DIETIME=2               # Time to wait for the server to die, in seconds
                        # If this value is set too low you might not
                        # let some servers to die gracefully and
                        # 'restart' will not work

# Include defaults if available
if [ -f /etc/default/$NAME ] ; then
	. /etc/default/$NAME
fi

# Use this if you want the user to explicitly set 'RUN' in
# /etc/default/
if [ "x$RUN" != "xyes" ] ; then
    exit 0
fi

set -e

running_pid() {
# Check if a given process pid's cmdline matches a given name
    pid=$1
    name=$2
    [ -z "$pid" ] && return 1
    [ ! -d /proc/$pid ] &&  return 1
    cmd=`cat /proc/$pid/cmdline | tr "\000" "\n"|head -n 1 |cut -d : -f 1`
    # Is this the expected server
    [ "$cmd" != "$name" ] &&  return 1
    return 0
}

running() {
# Check if the process is running looking at /proc
# (works for all users)
    sleep 1
    # No pidfile, probably no daemon present
    [ ! -f "$PIDFILE" ] && return 1
    pid=`cat $PIDFILE`
    running_pid $pid $DAEMON || return 1
    return 0
}

start_server() {
# Start the process using the wrapper

        start-stop-daemon --start --quiet --make-pidfile --pidfile $PIDFILE \
            --background --chuid $USER:$GROUP --no-close \
	    --exec $DAEMON -- $DAEMON_OPTS >> $LOGFILE 2>&1

        errcode=$?
	return $errcode
}

stop_server() {
# Stop the process using the wrapper
        start-stop-daemon --stop --quiet --remove-pidfile --pidfile $PIDFILE \
            --exec $DAEMON
        errcode=$?
	return $errcode
}

force_stop() {
# Force the process to die killing it manually
	[ ! -e "$PIDFILE" ] && return
	if running ; then
		kill -15 $pid
	# Is it really dead?
		sleep "$DIETIME"s
		if running ; then
			kill -9 $pid
			sleep "$DIETIME"s
			if running ; then
				echo "Cannot kill $NAME (pid=$pid)!"
				exit 1
			fi
		fi
	fi
	rm -f $PIDFILE
}


case "$1" in
  start)
	log_daemon_msg "Starting $DESC " "$NAME"
        # Check if it's running first
        if running ;  then
            log_progress_msg "apparently already running"
            log_end_msg 0
            exit 0
        fi
        if start_server && running ;  then
            # It's ok, the server started and is running
            log_end_msg 0
        else
            # Either we could not start it or it is not running
            # after we did
            # NOTE: Some servers might die some time after they start,
            # this code does not try to detect this and might give
            # a false positive (use 'status' for that)
            log_end_msg 1
        fi
	;;
  stop)
        log_daemon_msg "Stopping $DESC" "$NAME"
        if running ; then
            # Only stop the server if we see it running
            stop_server
            log_end_msg $?
        else
            # If it's not running don't do anything
            log_progress_msg "apparently not running"
            log_end_msg 0
            exit 0
        fi
        ;;
  force-stop)
        # First try to stop gracefully the program
        $0 stop
        if running; then
            # If it's still running try to kill it more forcefully
            log_daemon_msg "Stopping (force) $DESC" "$NAME"
            force_stop
            log_end_msg $?
        fi
	;;
  restart|force-reload)
        log_daemon_msg "Restarting $DESC" "$NAME"
        stop_server
        # Wait some sensible amount, some server need this
        [ -n "$DIETIME" ] && sleep $DIETIME
        start_server
        running
        log_end_msg $?
	;;
  status)

        log_daemon_msg "Checking status of $DESC" "$NAME"
        if running ;  then
            log_progress_msg "running"
            log_end_msg 0
        else
            log_progress_msg "apparently not running"
            log_end_msg 1
            exit 1
        fi
        ;;
  reload)
        log_warning_msg "Reloading $NAME daemon: not implemented, as the daemon"
        log_warning_msg "cannot re-read the config file (use restart)."
        ;;

  *)
	N=/etc/init.d/$NAME
	echo "Usage: $N {start|stop|force-stop|restart|force-reload|status}" >&2
	exit 1
	;;
esac

exit 0
```

Save the file!

### Autostarting

Almost ready, Now, In `/etc/default/darkice` check that you have

```yaml
RUN=yes
```

Then restart the service

```bash
systemctl daemon-reload
```

Add default user nobody to the audio group (in my case, to work with ALSA)

```bash
adduser nobody audio
```

Fix start sequence so that Darkice is one of the last services to load

```bash
update-rc.d -f darkice remove
update-rc.d darkice defaults 99
```

Not directly related to the init script, but note that darkice is being run as nobody:nobody. This user can’t set the realtime scheduling priority requests in darkice’s configuration file, so we give the binary that capability:

```bash
sudo setcap cap_sys_nice=+ep `which darkice`
```

## Reboot and connect to your USB turntable

That is it, connect your streaming client up to (http://vinyl/listen.mp3) and put on a record, you should now be able to enjoy the tunes from the deck on your computer.

### Sonos / Tunein

On Sonos, add your streaming turntable URL (http://vinyl/listen.mp3) by Using the Sonos App for iOS or Android:

* From the Browse tab, select Radio by TuneIn.
* Tap My Radio Stations.
* Tap the three dots in the top right and tap Add New Radio Station.
* Enter the Streaming URL and Station Name and tap OK.
### Pi Musicbox

On Pi Musicbox, add the URL to your `/boot/config/radiostations.js` file or use the GUI.

Or switch to [Volumio](https://volumio.org/).

## Acknowledgements

Data in this post is a collection from 3 sources, and combined into a single unified flow, tested on a Pi3, running Buster 2021-02

* https://mykter.com/2019/02/02/streaming-vinyl-raspberry-pi
* https://github.com/basdp/USB-Turntables-to-Sonos-with-RPi
* https://github.com/coreyk/darkice-libaacplus-rpi-guide/blob/master/README.md

