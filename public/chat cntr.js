const socket = io.connect('http://localhost:3000');
const baseUrl = window.location.origin;
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const findUsers = document.getElementById('findUsers');
    const receiverAvatar = document.getElementById('receiverAvatar');
    const chat = document.getElementById('message-container');
    const invCounter = document.getElementById('invCounter');
    const messCounter = document.getElementById('messCounter');
    const groupCounter = document.getElementById('groupCounter');
    let messageValue = 0;
    let receiver = '';
    const cryptoDiv = document.getElementById("crypto");
    const originalWidth = cryptoDiv.offsetWidth;
    document.getElementById("crypto").addEventListener('click', () => {
        cryptoDiv.style.width = `${originalWidth}px`
        if(document.getElementById("crypto").textContent.includes("No Storing Messages")) {
            
            
            document.getElementById("crypto").textContent = 'Store Messages';
        }
        else document.getElementById("crypto").textContent = 'No Storing Messages';
        const icon = document.createElement('i')
        icon.classList.add('icon-user-secret');
        icon.classList.add('accIon');
        document.getElementById("crypto").appendChild(icon); // Change only the text in the crypto div
    });
    
    const username = localStorage.getItem('username');
    if (document.getElementById("message")) {
        document.getElementById("message").addEventListener("keydown", function(e) {
            let messageSent = document.getElementById("message").value;
            const inputValString = String(messageSent);
            
            if (e.key === 'Enter') {
                console.log(receiver)
                e.preventDefault();
                if (messageSent !== null && messageSent.trim() !== '' && receiver !== '') {
                    //const chat = document.getElementById("chat");
                    //const receiver = 'art2';
                    console.log("my mess");
                    chat.innerHTML += (`<div class="bubble left" style="word-break: break-word">${inputValString}</div>`);
                    adjustMarginForScrollbar();
                    
                    console.log(username);
                    socket.emit('chatMessage', { username, messageSent, receiver });
                    document.getElementById("message").value = "";
                    document.getElementById("message").style.height = '80px';
                    console.log(messageSent);
                    jQuery("#message-container").scrollTop(jQuery("#message-container")[0].scrollHeight);
                }
            }
        });
    }
    const options = document.getElementById('options');
    const friends = document.getElementById('friends');

    function updateOptionsWidth() {
        // Calculate the width of the #friends div
        const friendsWidth = friends.offsetWidth; // Get width in pixels
        // Set the width of the #options div to match the #friends width
        options.style.width = `${friendsWidth}px`; // Set width in pixels
    }

// Call the function initially to set the width when the page loads
    updateOptionsWidth();

    findUsers.addEventListener('click', () => {
        if (options.classList.contains('animate')) {
            // Hide the div
            options.classList.remove('animate');
            options.addEventListener('transitionend', () => {
                options.style.visibility = 'hidden'; // Hide after animation ends
            }, { once: true });
        } else {
            // Show the div
            options.style.visibility = 'visible'; // Ensure it is visible
            // Trigger reflow
            void options.offsetWidth; // Forces reflow to apply animation
            // Start animation
            options.classList.add('animate');
        }
        document.getElementById('friends').classList.toggle('hidden');
    });

// Add resize event listener
    window.addEventListener('resize', updateOptionsWidth);

    
    socket.on('connect', () => {
        const username = localStorage.getItem('username');
        socket.emit('login', username);
        console.log('Username emitted to server:', username);
    });
    
    socket.on('blockedNotification', (data) => {
        console.log(data);
        //socket.emit('findUsers', searchUser);
    });
    socket.on('user info', ({ id, profileImage }) => {
        console.log(`User ID: ${id}`);
        if (profileImage != null) document.getElementById("initials").remove();
        else {
            document.getElementById("initials").classList.remove('display');
            document.getElementById("initials").style.visibility = 'visible';
        }
        // Check if profile image exists
        if (profileImage) {
            const avatarContainer = document.getElementById("avatarOrInitials");
            const existingAvatar = document.getElementById('avatar');
    
            // Remove existing avatar if any
            // if (existingAvatar) {
            //     existingAvatar.remove();
            // }
    
            const avatar = document.createElement('div');
            avatar.id = 'avatar';
            avatarContainer.appendChild(avatar);
    
            const img = new Image();
            img.src = profileImage; // Use the emitted profile image path
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.borderRadius = '50%';
            img.style.objectFit = 'cover';
    
            avatar.appendChild(img);
        } else {
            // Handle the case where there's no profile image
            console.log('No profile image found.');
            // Optionally show a placeholder or initials
        }
    });
    
    socket.on('avatar', (relativePath) => {
        const divToRemove = document.getElementById('initials');
        const divToRemove1 = document.getElementById('avatar');
        if (divToRemove) divToRemove.remove();
        if (divToRemove1) divToRemove1.remove();    
             // Removes the div from the DOM
            const avatar = document.createElement('div');
            avatar.id = 'avatar';
            document.getElementById("avatarOrInitials").appendChild(avatar);
    
            const img = new Image();
            img.src = relativePath;
            
            // Set styles for the image
            img.style.width = '100%'; // Make the image fill the div
            img.style.height = '100%'; // Make the image fill the div
            img.style.borderRadius = '50%'; // Apply border radius to the image
            img.style.objectFit = 'cover'; // Optional: cover the div while maintaining aspect ratio
    
            avatar.appendChild(img);
        
    });
    
    
    const messages = document.getElementById('messages');
    const formMessage = document.getElementById('chat-form');
    const inputMessage = document.getElementById('message');


// Update the receiver variable when the input changes
// receivers.addEventListener('input', () => {
//     receiver = receivers.value.trim(); // Update on input change
//     console.log('Updated receiver:', receiver);
// });

// formMessage.addEventListener('submit', (e) => {
//     e.preventDefault();
//     const message = inputMessage.value.trim();
//     const user = localStorage.getItem('username');
    
//     // Log the receiver and message
//     if (!message || !receiver) {
//         console.log('Message or receiver is missing');
//         return;  // Exit if either the message or receiver is empty
//     }
    
//     console.log('Submitting message:', receiver, message); // Log the receiver and message if valid
    
//     socket.emit('chatMessage', { user, message, receiver });
//     inputMessage.value = ''; // Clear the message input after sending
// });



    const usersDiv = document.getElementById('users');
    let searchUser = 'p';

    searchInput.addEventListener('input', () => {
        searchUser = searchInput.value.trim();
        if (searchUser) {
            console.log('Input search user:', searchUser);
            socket.emit('findUsers', searchUser);
        } else {
            usersDiv.innerHTML = '';
        }
    });

// Utility function to load an image using a Promise
// Utility function to load an image with a timeout for better control
function loadImageAsync(src, timeout = 500) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        let timedOut = false;

        // Reject after timeout to prevent infinite waiting for slow-loading images
        const timer = setTimeout(() => {
            timedOut = true;
            reject(new Error(`Image load timed out for ${src}`));
        }, timeout);

        img.src = src;

        img.onload = () => {
            if (!timedOut) {
                clearTimeout(timer); // Clear the timeout if it loads in time
                resolve(img);
            }
        };

        img.onerror = () => {
            if (!timedOut) {
                clearTimeout(timer);
                reject(new Error(`Image failed to load for ${src}`));
            }
        };
    });
}

// Listen for 'foundUsers' event
// Assuming this is your loading icon
const loadingIcon = document.querySelector('.icon-spin3'); // Ensure this selects your loading icon

// Listen for 'foundUsers' event
socket.on('inviteProcessed', () => {
    socket.emit('findUsers', searchUser);
    console.log('Find users after invite:', searchUser);
});
socket.on('foundUsers', async (founded) => {
    console.log('Found users:', founded);
    const receiverElement = document.getElementById('receiverName');
    // Clear previous user list
    usersDiv.innerHTML = ''; // Clear the previous list

    // Show loading icon when starting to append users
    // loadingIcon.classList.remove('display');
    // loadingIcon.classList.add('animate-spin');
    //document.getElementById("users").appendChild(loadingIcon);

    const fragment = document.createDocumentFragment();

    // Loop over the found users
    founded.forEach((user) => {
        const userDiv = document.createElement('div');
        userDiv.classList.add('user');

        const profileContainer = document.createElement('div');
        profileContainer.classList.add('profile-container');

        // Create initials element but keep it hidden initially
        const initials = document.createElement('div');
        initials.classList.add('initials');
        initials.textContent = user.username.charAt(0).toUpperCase();
        initials.style.visibility = 'hidden';  // Keep hidden initially
        profileContainer.appendChild(initials);

        userDiv.appendChild(profileContainer);

        const userInfoDiv = document.createElement('div');
        userInfoDiv.classList.add('user-info');
        const usernameText = document.createElement('div');
        usernameText.classList.add('username');
        usernameText.textContent = user.username;
        userInfoDiv.appendChild(usernameText);

        const buttonsDiv = document.createElement('div');
        buttonsDiv.classList.add('buttons');
        // Create buttons and append to buttonsDiv...
        const inviteButton = document.createElement('button');
        inviteButton.classList.add('invite');
        inviteButton.value = user.username;
        const inviteIcon = document.createElement('i');
        inviteIcon.classList.add('icon-user-plus');
        inviteButton.appendChild(inviteIcon);
        if (user.isFriend != 1) buttonsDiv.appendChild(inviteButton);

        // Create send message button
        const sendButton = document.createElement('button');
        sendButton.classList.add('send');
        sendButton.value = user.username;
        const sendIcon = document.createElement('i');
        sendIcon.classList.add('icon-comment');
        sendButton.appendChild(sendIcon);
        buttonsDiv.appendChild(sendButton);

        // Create block button
        const blockButton = document.createElement('button');
        blockButton.classList.add('block');
        blockButton.value = user.username;
        const blockIcon = document.createElement('i');
        blockIcon.classList.add('icon-block-1');
        blockButton.appendChild(blockIcon);
        buttonsDiv.appendChild(blockButton);

        // Append buttons to userInfoDiv
        userInfoDiv.appendChild(buttonsDiv);

        // Append userInfoDiv to userDiv
        userDiv.appendChild(userInfoDiv);
        userDiv.appendChild(userInfoDiv);
        fragment.appendChild(userDiv);
        //userDiv.appendChild(sendButton);  // Append send button
    
        sendButton.addEventListener('click', async () => {
            receiver = sendButton.value;

            // Emit findUsers without awaiting the response
            socket.emit('findUsers', searchUser); // This might be adjusted based on your logic

            // Assume that the server will respond with found users
            socket.once('foundUsers', (foundUsers) => {
                const foundUser = foundUsers.find(u => u.username === receiver);
                if (foundUser) {
                    receiverElement.textContent = receiver;

                    // Clear existing content in #receiverAvatar
                    receiverAvatar.innerHTML = ''; 
                    const profileContainer = userDiv.querySelector('.profile-container');

                    // Check for the presence of an img element
                    const img = profileContainer.querySelector('img.profile-image');
                    const initialsElement = profileContainer.querySelector('.initials');

                    // Append the image or initials based on availability
                    if (img) {
                        const clonedImg = img.cloneNode();
                        clonedImg.classList.remove('profile-image');
                        clonedImg.id = 'receiverAvatar';
                        receiverAvatar.appendChild(clonedImg);
                    } else if (initialsElement) {
                        const clonedInitials = initialsElement.cloneNode(true);
                        clonedInitials.classList.remove('initials');
                        clonedInitials.id = 'receiverInitials';
                        receiverAvatar.appendChild(clonedInitials);
                    }

                    socket.emit('sendMeMessages', username, receiver);
                }
            });
        });
        
        socket.on('messagesResponse', (decryptedMessages) => {
            console.log(decryptedMessages);
            //const chat = document.getElementById("chat");
            chat.innerHTML = '';
            decryptedMessages.forEach(message => {
                if (message.senderUsername == username) {
                    chat.innerHTML += (`<div class="bubble left" style="word-break: break-word">${message.message}</div>`);
                    adjustMarginForScrollbar();
                    jQuery("#message-container").scrollTop(jQuery("#message-container")[0].scrollHeight);
                }
                else {
                    chat.innerHTML += (`<div class="bubble right" style="word-break: break-word">${message.message}</div>`);
                    jQuery("#message-container").scrollTop(jQuery("#message-container")[0].scrollHeight);
                }

            });
        })
            // Select all elements with the class 'send'
const sendButtons = document.querySelectorAll('.send');


            blockButton.addEventListener('click', () => {
                blockButton.disabled = true; 
                const blockedUser = blockButton.value;
                socket.emit('block', blockedUser, (response) => {
                    if (response.success) {
                        socket.emit('findUsers', searchUser);
                        console.log(response.message);
                    } else {
                        console.error('Failed to block user:', response.error);
                    }
                });
            });
            inviteButton.addEventListener('click', () => {
                const invitedUser = inviteButton.value;
                console.log('Inviting user:', invitedUser); 
                inviteButton.disabled = true; // Disable button to prevent multiple invites
                socket.emit('invite', invitedUser);
    
                // Reset the user list and then re-fetch after processing the invite
                
            });
        // Now load the image asynchronously
        if (user.profileImage) {
            loadImageAsync(user.profileImage)
                .then((userImage) => {
                    userImage.alt = `${user.username}'s profile image`;
                    userImage.classList.add('profile-image');
                    initials.style.display = 'none';  // Keep initials hidden if the image loads
                    profileContainer.appendChild(userImage);
                })
                .catch((error) => {
                    console.log(`Failed to load image for user: ${user.username}`, error.message);
                    initials.style.visibility = 'visible';  // Show initials if image fails to load
                });
        } else {
            initials.style.visibility = 'visible';  // Show initials if there's no image
        }
    });

    usersDiv.appendChild(fragment);

    // Hide loading icon after appending users
    // loadingIcon.classList.add('display');
    // loadingIcon.classList.remove('animate-spin');
    // document.getElementById("users").removeChild(loadingIcon);
});















// Helper function to create a fallback avatar with the first character of the username
function appendFallbackAvatar(userDiv, username) {
    const fallbackDiv = document.createElement('div');
    fallbackDiv.classList.add('profile-fallback');
    fallbackDiv.textContent = username.charAt(0).toUpperCase(); // Use the first character of the username

    // Append the fallback div instead of the image
    userDiv.appendChild(fallbackDiv);
}





socket.on('message', (data) => {
    console.log(data);

    // Handle message from the receiver
    if (data.user === receiver) {
        handleIncomingMessage(data.message);
    } else {
        handleOtherMessage(data.user);
    }
});

function handleIncomingMessage(message) {
    adjustMarginForScrollbar();
    const messRec = String(message);
    
    chat.innerHTML += `<div class="bubble right" style="word-break: break-word">${messRec}</div>`;
    jQuery("#message-container").scrollTop(jQuery("#message-container")[0].scrollHeight);
}

function handleOtherMessage(user) {
    if (document.querySelector(`${user}`)) {
        console.log("exits");
    }
    else console.log("not exits");

    let messageValue = parseInt(messCounter.getAttribute('value'), 10); // Default to 0 if NaN
    console.log(messCounter);
    messageValue++;

    // Update the `value` attribute and text content of the div
    messCounter.setAttribute('value', messageValue);
    messCounter.textContent = messageValue;
}

    socket.on('send invitation', (data) => {
        console.log('Invitation data received:', data);
        // const userConfirmed = confirm(`${data.from} wants to be your friend. Do you accept?`);
        // const inviteDecision = userConfirmed ? true : false;
        // socket.emit('confirm invite', { decision: inviteDecision, invitingId: data.id });
    });
    
const typingIndicator = document.getElementById('typingIndicator');
//const receivers = document.getElementById('rec'); // Receiver's input element
 // Global receiver variable

// receivers.addEventListener('input', () => {
//     receiver = receivers.value.trim(); // Update receiver when the input changes
// });
    const fileInput = document.getElementById('fileInput'); // Replace with your file input element's ID

fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];

    // Check if a file is selected
    if (!file) {
        console.error('No file selected!');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        const imageData = event.target.result; // This will be the data URL

        // Emit the file data and file type
        socket.emit('uploadImage', {
            imageData: imageData.split(',')[1], // Get the base64 encoded part
            fileType: file.type // This should be something like 'image/png', 'image/jpeg', etc.
        });
    };
    
    // Read the file as a Data URL
    reader.readAsDataURL(file);
});



    // Listening for the new image event
// socket.on('newImage', function(data) {
//     // Create a Blob from the received image data
//     const blob = new Blob([data], { type: 'image/jpeg' }); // Set the correct MIME type
//     const imageUrl = URL.createObjectURL(blob);

//     // Create an image element and set its source
//     const img = document.createElement('img');
//     img.src = imageUrl;

//     // Optionally, you can style or set attributes for the image
//     img.style.maxWidth = '100%'; // Example styling
//     img.style.height = 'auto';

//     // Append the image to the desired container in your chat interface
//     document.getElementById("menu").appendChild(img);
// });


    let typingTimer;
    const typingDelay = 2000; // 2 seconds typing delay
    const currentUsername = localStorage.getItem('username'); // Get the current user's username
    document.getElementById("initials").textContent = currentUsername.charAt(0).toUpperCase();
    const messageInput = document.getElementById('message');
    messageInput.addEventListener('input', () => {
        console.log("type");
        console.log(receiver)
        // Ensure receiver is set before emitting typing event
        if (receiver) {
            console.log("type");
            socket.emit('typing', true, receiver); // Pass the receiver to the typing event
        }

        // Clear the previous timer
    clearTimeout(typingTimer);

    // Set a new timer to emit typing stopped after the delay
    typingTimer = setTimeout(() => {
        if (receiver) {
            console.log("type");
            socket.emit('typing', false, receiver); // Emit typing stopped with receiver
        }
    }, typingDelay);
});

// Listen for 'userTyping' event from the server
socket.on('userTyping', ({ isTyping, sender }) => {
    const mails = document.getElementsByClassName("icon-keyboard");
    console.log(isTyping, sender);
    
    // Check if there is at least one element with the class "icon-keyboard"
    if (mails.length > 0) {
        const mail = mails[0]; // Get the first element

        if (isTyping && sender === receiver) {
            console.log("typing show");

            // Remove 'hidden' and add 'visible'
            mail.classList.remove('hidden');
            mail.classList.add('visible');
            
            mail.classList.add('blink');  // Add blink effect
        } else {
            console.log("typing hide");

            // Remove 'visible' and add 'hidden'
            mail.classList.remove('visible');
            mail.classList.add('hidden');

            mail.classList.remove('blink');  // Remove blink effect
        }
    }
});



function adjustMarginForScrollbar() {
    //const chat = document.getElementById('chat');
    const messages = document.querySelectorAll('.right');

    // Check if the scrollbar is visible
    const hasScrollbar = chat.scrollHeight > chat.clientHeight;

    // Adjust right margin of messages based on scrollbar presence
    messages.forEach(message => {
        if (hasScrollbar) {
            console.log("marg")
            message.style.marginRight = '10px'; // Adjust margin when scrollbar is present
        } 
    });
}




});
