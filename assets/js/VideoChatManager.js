const socket = io('https://videochat.resetstudio.it:3000/')
const videoGrid = document.getElementById('video-grid')
const myPeer = new Peer(undefined, {
    config: {
        'iceServers': [
            { url: 'stun:stun.l.google.com:19302' },
            { url: 'turn:167.71.53.171', username: 'user', credential: 'pass' }
        ]
    } /* Sample servers, please use appropriate ones */,
    host: 'videochat.resetstudio.it',
    secure: true,
    path: 'peerjs/myapp',
    port: '3000'
})
const myVideo = document.createElement('video')
myVideo.muted = true
const peers = {}
navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    addVideoStream(myVideo, stream, "myPeer")

    myPeer.on('call', call => {
        call.answer(stream)
        const video = document.createElement('video')
        call.on('stream', userVideoStream => {
            addVideoStream(video, userVideoStream, call.peer, 'myPeerOnCall')
        })
    })

    socket.on('user-connected', userId => {
        connectToNewUser(userId, stream)
    })
})

socket.on('user-disconnected', userId => {
    if (document.getElementById("video-div-id-" + userId)) {
        document.getElementById("video-div-id-" + userId).remove();
    }
    if (peers[userId]) peers[userId].close()
})
let myID = null;
myPeer.on('open', id => {
    //socket.emit('join-room', ROOM_ID, id)
    myID = id;
})
if (ROOM_ID) {
    console.log(ROOM_ID)
    myPeer.on('open', id => {
        myID = id;
        socket.emit('join-room', ROOM_ID, id)
    })
}
function disconnectFromRoom(newRoom = null) {
    if (newRoom == ROOM_ID) {
        return
    }
    if (ROOM_ID) {
        socket.emit('disconnect-from-room', ROOM_ID, myID);
        console.log("Disconnecting...")
        socket.emit('disconnected', myID);
        ROOM_ID = null;
    }
    console.log(peers);
    //Remove others
    if (Object.keys(peers).length) {
        let i = 0
        while (i < Object.keys(peers).length) {
            let key = Object.keys(peers)[i];
            if (document.getElementById("video-div-id-" + key)) {
                document.getElementById("video-div-id-" + key).remove();
            }
            i++;
        }
    }

}
//@m0de you should use this function
function switchRoom(_roomId) {
    disconnectFromRoom(_roomId);
    ROOM_ID = _roomId;
    console.log(myID + " moving to " + ROOM_ID);
    socket.emit('join-room', ROOM_ID, myID)
    document.getElementById("currentRoom").innerHTML = ROOM_ID;
}
let joinRoomTriggerContainer = document.getElementById("joinRoomTriggers");
for (let index = 0; index < joinRoomTriggerContainer.children.length; index++) {
    const joinRoomTrigger = joinRoomTriggerContainer.children[index];
    joinRoomTrigger.addEventListener("click", function () {
        switchRoom(joinRoomTrigger.getAttribute("data-room"));
    });
}


function connectToNewUser(userId, stream) {
    const call = myPeer.call(userId, stream)
    const video = document.createElement('video')
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream, userId, 'connectToNewUser')
    })
    call.on('close', () => {
        if (document.getElementById("video-div-id-" + userId)) {
            document.getElementById("video-div-id-" + userId).remove();
        }
        console.log(userId + ' removed');
        if (peers[userId]) peers[userId].close()
        //video.remove()
    })

    peers[userId] = call
}
var videoControlsOriginal = document.getElementById("video-controls-my").cloneNode(true);
document.getElementById("video-controls-my").remove();
function addVideoStream(video, stream, peerID = null, from = 'null') {
    console.log("HELLO FROM " + from);
    if (document.getElementById("video-div-id-" + peerID)) {
        //document.getElementById("video-div-id-" + peerID).remove();
        return
    }
    video.srcObject = stream
    let videoDiv = document.createElement('div');
    videoDiv.setAttribute("class", "video-div")
    videoDiv.setAttribute("id", "video-div-id-" + peerID)
    if (peerID) {
        video.setAttribute('data-peer', peerID);
        video.setAttribute('id', 'video-' + peerID);
        let videoControls = videoControlsOriginal.cloneNode(true);
        videoControls.setAttribute("id", "video-controls-" + peerID);
        for (i = 0; i < videoControls.children.length; i++) {
            videoControls.children[i].setAttribute("data-peer", peerID);
            videoControls.children[i].addEventListener("click", function (event) {
                let el = event.target || event.srcElement;
                handleVideoUI(el)
            });
        }
        videoDiv.append(videoControls);
    }

    video.addEventListener('loadedmetadata', () => {
        video.play()
    })
    videoDiv.prepend(video)
    videoGrid.append(videoDiv)
}
function handleVideoUI(el) {
    let videoID = "video-" + el.getAttribute("data-peer");
    let videoEL = document.getElementById(videoID);
    if (el.getAttribute("data-action") == "hide") {
        if (el.getAttribute("data-hidden") == 0) {
            videoEL.pause();
            el.setAttribute("data-hidden", 1);
            el.innerHTML = "unhide";
            videoEL.style = "opacity: 0";
        } else {
            videoEL.play();
            el.setAttribute("data-hidden", 0);
            videoEL.style = "opacity: 1";
            el.innerHTML = "hide";
        }

    }
    if (el.getAttribute("data-action") == "mute") {
        videoEL.muted = !videoEL.muted;
    }
}