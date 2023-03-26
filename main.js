let APP_ID = "d91b9efb43b141caa2b1cc241686c7fa"
let token = null;
let uid = String(Math.floor(Math.random() * 100000))
let queryString=window.location.search
let urlParams=new URLSearchParams(queryString)
let roomId=urlParams.get('room')

if(!roomId){
    window.location='lobby.html'
}

let client;
let channel;

let localStream;
let remoteStream;
let peerConnection;

const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
}

let constraints={
    video:{
        width:{min:640,ideal:1920,max:1920},
        heigth:{min:480,ideal:1080,max:1080}
    },
    audio:true
}


let init = async () => {
    client = await AgoraRTM.createInstance(APP_ID)
    await client.login({ uid, token })

    //index.html?room=234234
    channel = client.createChannel(roomId)
    await channel.join()

    channel.on('MemberJoined', handleUserJoined)
    channel.on('MemberLeft', handlerUserLeft)

    client.on('MessageFromPeer', handleMessageFromPeer)

    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    document.querySelector("#user-1").srcObject = localStream
}
let handlerUserLeft = (MemberId) => {
    document.querySelector('user-2').style.display = "none"
    document.querySelector("#user-1").classList.remove('smallFrame')
}

let handleMessageFromPeer = async (message, MemberId) => {
    message = JSON.parse(message.text)
    if (message.type === "offer") {
        createAnswer(MemberId, message.offer)
    }
    if (message.type === "answer") {
        addAnswer(message.answer)
    }
    if (message.type === "candidate") {
        if (peerConnection) {
            peerConnection.addIceCandidate(message.candidate)
        }
    }
    // console.log('Message', message)
}
let handleUserJoined = async (MemberId) => {
    console.log('A new user joined the channel', MemberId)
    createOffer(MemberId)

}

let createPeerConnection = async (MemberId) => {
    peerConnection = new RTCPeerConnection(servers);//store all the info between us and the remote peer
    remoteStream = new MediaStream();
    document.querySelector("#user-2").srcObject = remoteStream
    document.querySelector("#user-2").style.display = 'block'
    document.querySelector("#user-1").classList.add('smallFrame')
    if (!localStream) {
        localStream = await navigator.mediaDevices.getUserMedia(constraints)
        document.querySelector("#user-1").srcObject = localStream
    }

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream)
    })
    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track)
        })
    }

    peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
            // console.log('New Ice Candidate', event.candidate)
            client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'candidate', 'candidate': event.candidate }) }, MemberId)
        }
    }
}

let createOffer = async (MemberId) => {
    await createPeerConnection(MemberId)

    let offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'offer', 'offer': offer }) }, MemberId)
}

let createAnswer = async (MemberId, offer) => {
    await createPeerConnection(MemberId)
    await peerConnection.setRemoteDescription(offer)
    let answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'answer', 'answer': answer }) }, MemberId)
}

let addAnswer = async (answer) => {
    if (!peerConnection.currentRemoteDescription) {
        peerConnection.setRemoteDescription(answer)
    }
}

let leaveChannel=async()=>{
    await channel.leave()
    await client.logout()
}

let toggleCamera=async()=>{
let videoTrack=localStream.getTracks().find(track=>track.kind==='video')
if(videoTrack.enabled){
    videoTrack.enabled=false
    document.querySelector('#camera-btn').style.backgroundColor='rgb(255,80,80)'
  
}else{
    videoTrack.enabled=true
    document.querySelector('#camera-btn').style.backgroundColor='rgb(179,102,249,0.9)'
}
}
let toggleMic=async()=>{
    let audioTrack=localStream.getTracks().find(track=>track.kind==='audio')
    if(audioTrack.enabled){
        audioTrack.enabled=false
        document.querySelector('#mic-btn').style.backgroundColor='rgb(255,80,80)'
      
    }else{
        audioTrack.enabled=true
        document.querySelector('#mic-btn').style.backgroundColor='rgb(179,102,249,0.9)'
    }
    }
window.addEventListener('beforeunload',leaveChannel)
document.querySelector('#camera-btn').addEventListener('click',toggleCamera)
document.querySelector('#mic-btn').addEventListener('click',toggleMic)
init()