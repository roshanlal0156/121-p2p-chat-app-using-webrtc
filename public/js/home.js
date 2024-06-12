const createChatRoomBtn = document.querySelector("#create-chat-room");
const joinChatRoomBtn = document.querySelector("#join-chat-room");
const submitBtn = document.querySelector("#submit-btn");
const roomIdInput = document.querySelector("#room-id");
let formRoomId = document.querySelector("#form-room-id");
let iPhoneMessageList = document.querySelector("#i-phone-msg-list");
let sendMessageBtn = document.querySelector("#send-msg-btn");
let msgInput = document.querySelector("#type-msg");
let createdRoomId = document.querySelector("#created-room-id");
let createdRoomIdInput = document.querySelector("#created-room-id-input");
let iPhone = document.querySelector("#i-phone");

let room_id;

createChatRoomBtn.addEventListener("click", () => {
  //make http call and get room_id
  fetch("/create-room-id", { method: "post" })
    .then((res) => {
      return res.json();
    })
    .then((data) => {
      room_id = data.room_id;

      let ws = new WebSocket("ws://127.0.0.1:3000");

      let localConnection;

      ws.onopen = () => {
        localConnection = new RTCPeerConnection();

        localConnection.onicecandidate = (e) => {
          console.log(
            " NEW ice candidate!! on localconnection reprinting SDP "
          );
          console.log(JSON.stringify(localConnection.localDescription));

          ws.send(
            JSON.stringify({
              room_id: room_id,
              offer: localConnection.localDescription,
            })
          );
        };

        const sendChannel = localConnection.createDataChannel("sendChannel");
        sendChannel.onmessage = (e) => {
          console.log("messsage received!!!" + e.data);
          let span = document.createElement("span");
          span.innerHTML = e.data;
          let li = document.createElement("li");
          li.classList.add("receiver-msg");
          li.appendChild(span);
          iPhoneMessageList.appendChild(li);
          iPhoneMessageList.scrollTop = iPhoneMessageList.scrollHeight;
        };
        sendChannel.onopen = (e) => {
          console.log("open!!!!");
          createdRoomId.style.display = "none";
          iPhone.style.display = "block";
        };
        sendChannel.onclose = (e) => console.log("closed!!!!!!");
        sendMessageBtn.addEventListener("click", () => {
          let msg = msgInput.value;
          sendChannel.send(msg);

          let span = document.createElement("span");
          span.innerHTML = msg;
          let li = document.createElement("li");
          li.classList.add("sender-msg");
          li.appendChild(span);
          iPhoneMessageList.appendChild(li);
          iPhoneMessageList.scrollTop = iPhoneMessageList.scrollHeight;
          msgInput.value = "";
        });
        msgInput.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            sendMessageBtn.click();  
          }
        });

        localConnection.createOffer().then((o) => {
          localConnection.setLocalDescription(o).then((a) => {
            ws.onmessage = (message) => {
              console.log("message!!!!");
              console.log(message.data);
              let answer = JSON.parse(message.data);
              console.log(answer);
              answer = answer["answer"];
              console.log(answer);

              localConnection.setRemoteDescription(answer).then((a) => {
                console.log("done");
              });
            };
          });
        });
      };

      createdRoomId.classList.remove("d-none");
      createdRoomIdInput.value = room_id;

    });
});

submitBtn.addEventListener("click", () => {
  room_id = roomIdInput.value;
  fetch("/get-offer?room_id=" + room_id, { method: "get" })
    .then((res) => {
      return res.json();
    })
    .then(async (data) => {
      // ----------------------------------------------------websocket--------------------------------------------------------
      let ws = new WebSocket("ws://127.0.0.1:3001");

      ws.onmessage = (message) => {
        console.log("message joinee!!!!");
      };

      ws.onopen = async () => {
        // ----------------------------------------------------wrtcp--------------------------------------------------------
        console.log(data.offer);
        //set offer const offer = ...
        const offer = data.offer;
        const remoteConnection = new RTCPeerConnection();

        remoteConnection.onicecandidate = (e) => {
          console.log(
            " NEW ice candidnat!! on localconnection reprinting SDP "
          );
          console.log(JSON.stringify(remoteConnection.localDescription));

          ws.send(
            JSON.stringify({
              room_id: room_id,
              answer: remoteConnection.localDescription,
            })
          );
        };

        remoteConnection.ondatachannel = (e) => {
          const receiveChannel = e.channel;
          receiveChannel.onmessage = (e) => {
            console.log("messsage received!!! " + e.data);
            let span = document.createElement("span");
            span.innerHTML = e.data;
            let li = document.createElement("li");
            li.classList.add("receiver-msg");
            li.appendChild(span);
            iPhoneMessageList.appendChild(li);

            iPhoneMessageList.scrollTop = iPhoneMessageList.scrollHeight;
          };
          receiveChannel.onopen = (e) => {
            console.log("open!!!!");
            iPhone.style.display = "block";
            formRoomId.classList.add("d-none");
          };
          receiveChannel.onclose = (e) => console.log("closed!!!!!!");
          sendMessageBtn.addEventListener("click", () => {
            let msg = msgInput.value;
            receiveChannel.send(msg);

            let span = document.createElement("span");
            span.innerHTML = msg;
            let li = document.createElement("li");
            li.classList.add("sender-msg");
            li.appendChild(span);
            iPhoneMessageList.appendChild(li);
            iPhoneMessageList.scrollTop = iPhoneMessageList.scrollHeight;
            msgInput.value = "";
          });

          remoteConnection.channel = receiveChannel;
        };
        msgInput.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            sendMessageBtn.click();  
          }
        });

        remoteConnection.setRemoteDescription(offer).then((a) => {
          console.log("done");
          // create answer send to creator
          remoteConnection
            .createAnswer()
            .then((a) => remoteConnection.setLocalDescription(a))
            .then((a) => {
              console.log(JSON.stringify(remoteConnection.localDescription));
            });
        });

        //send the anser to the client
        // ----------------------------------------------------wrtcp-end--------------------------------------------------------
      };
      // ----------------------------------------------------websocket-end--------------------------------------------------------
    });
});

joinChatRoomBtn.addEventListener("click", () => {
  console.log("okok");
  formRoomId.classList.remove("d-none");
});
