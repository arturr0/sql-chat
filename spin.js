const socket = io.connect('https://able-futuristic-jam.glitch.me');
const baseUrl = window.location.origin;
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const optionsButton = document.getElementById('optionsButton');
    const options = document.getElementById('options');
    if (document.getElementById("message")) {
        document.getElementById("message").addEventListener("keydown", function(e) {
            let messageSent = document.getElementById("message").value;
            const inputValString = String(messageSent);
            
            if (e.key === 'Enter') {
                e.preventDefault();
                if (messageSent !== null && messageSent.trim() !== '') {
                    const chat = document.getElementById("chat");
                    //const receiver = 'art2';
                    
                    chat.innerHTML += (`<div class="bubble left" style="word-break: break-word">${inputValString}</div>`);
                    adjustMarginForScrollbar();
                    const username = localStorage.getItem('username');
                    console.log(username);
                    socket.emit('chatMessage', { username, messageSent, receiver });
                    document.getElementById("message").value = "";
                    console.log(messageSent);
                    jQuery("#chat").scrollTop(jQuery("#chat")[0].scrollHeight);
                }
            }
        });
    }
    optionsButton.addEventListener('click', () => {
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
    });
    socket.on('connect', () => {
        const username = localStorage.getItem('username');
        socket.emit('login', username);
        console.log('Username emitted to server:', username);
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
socket.on('foundUsers', async (founded) => {
    console.log('Found users:', founded);

    // Clear previous user list
    usersDiv.innerHTML = ''; // Clear the previous list

    // Show loading icon when starting to append users
    loadingIcon.classList.remove('display'); // Show the loading icon
    loadingIcon.classList.add('animate-spin'); // Add animation class
    document.getElementById("users").appendChild(loadingIcon);
    const fragment = document.createDocumentFragment();

    // Create user elements and load images concurrently
    const userPromises = founded.map(async (user) => {
        const userDiv = document.createElement('div');
        userDiv.classList.add('user');

        // Create a container for the profile image or initials
        const profileContainer = document.createElement('div');
        profileContainer.classList.add('profile-container');

        // Create initials element (fallback for when image isn't loaded)
        const initials = document.createElement('div');
        initials.classList.add('initials');
        initials.textContent = user.username.charAt(0).toUpperCase();
        profileContainer.appendChild(initials);

        // Check if user has a profile image
        if (user.profileImage) {
            try {
                // Load image asynchronously with a timeout
                const userImage = await loadImageAsync(user.profileImage);
                userImage.alt = `${user.username}'s profile image`;
                userImage.classList.add('profile-image');

                // Hide initials and append the loaded image
                initials.style.display = 'none';
                profileContainer.appendChild(userImage);
            } catch (error) {
                console.log(`Failed to load image for user: ${user.username}`, error.message);
                // Keep showing initials if image loading fails
            }
        }

        // Append profile container to userDiv
        userDiv.appendChild(profileContainer);

        // Create div for username and buttons
        const userInfoDiv = document.createElement('div');
        userInfoDiv.classList.add('user-info');

        // Create and append username
        const usernameText = document.createElement('div');
        usernameText.classList.add('username');
        usernameText.textContent = user.username;
        userInfoDiv.appendChild(usernameText);

        // Create buttons container
        const buttonsDiv = document.createElement('div');
        buttonsDiv.classList.add('buttons');

        // Create and append invite button
        const inviteButton = document.createElement('button');
        inviteButton.classList.add('send');
        inviteButton.value = user.username;
        const inviteIcon = document.createElement('i');
        inviteIcon.classList.add('icon-user-plus');
        inviteButton.appendChild(inviteIcon);
        buttonsDiv.appendChild(inviteButton);

        // Create send message button
        const sendButton = document.createElement('button');
        sendButton.classList.add('send');
        sendButton.value = user.username;
        const sendIcon = document.createElement('i');
        sendIcon.classList.add('icon-mail');
        sendButton.appendChild(sendIcon);
        buttonsDiv.appendChild(sendButton);

        // Create block button
        const blockButton = document.createElement('button');
        blockButton.classList.add('send');
        blockButton.value = user.username;
        const blockIcon = document.createElement('i');
        blockIcon.classList.add('icon-user-times');
        blockButton.appendChild(blockIcon);
        buttonsDiv.appendChild(blockButton);

        // Append buttons to userInfoDiv
        userInfoDiv.appendChild(buttonsDiv);

        // Append userInfoDiv to userDiv
        userDiv.appendChild(userInfoDiv);

        // Append userDiv to the fragment
        fragment.appendChild(userDiv);
    });

    // Wait for all users' elements to be created concurrently
    await Promise.all(userPromises);

    // Append the fragment with all users to the usersDiv
    usersDiv.appendChild(fragment);

    // Hide loading icon after appending users
    loadingIcon.classList.add('display'); // Hide the loading icon
    loadingIcon.classList.remove('animate-spin'); // Remove animation class
    document.getElementById("users").removeChild(loadingIcon);
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
        adjustMarginForScrollbar()
        const messRec = String(data.message);
        const chat = document.getElementById("chat");

        chat.innerHTML += (`<div class="bubble right" style="word-break: break-word">${data.message}</div>`);
        jQuery("#chat").scrollTop(jQuery("#chat")[0].scrollHeight);
    });
    socket.on('send invitation', (data) => {
        console.log('Invitation data received:', data);
        // const userConfirmed = confirm(`${data.from} wants to be your friend. Do you accept?`);
        // const inviteDecision = userConfirmed ? true : false;
        // socket.emit('confirm invite', { decision: inviteDecision, invitingId: data.id });
    });
    const messageInput = document.getElementById('message');
const typingIndicator = document.getElementById('typingIndicator');
//const receivers = document.getElementById('rec'); // Receiver's input element
let receiver = ''; // Global receiver variable

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
socket.on('newImage', function(data) {
    // Create a Blob from the received image data
    const blob = new Blob([data], { type: 'image/jpeg' }); // Set the correct MIME type
    const imageUrl = URL.createObjectURL(blob);

    // Create an image element and set its source
    const img = document.createElement('img');
    img.src = imageUrl;

    // Optionally, you can style or set attributes for the image
    img.style.maxWidth = '100%'; // Example styling
    img.style.height = 'auto';

    // Append the image to the desired container in your chat interface
    document.getElementById("menu").appendChild(img);
});


    let typingTimer;
    const typingDelay = 2000; // 2 seconds typing delay
    const currentUsername = localStorage.getItem('username'); // Get the current user's username

    messageInput.addEventListener('input', () => {
        // Ensure receiver is set before emitting typing event
        if (receiver) {
            socket.emit('typing', true, receiver); // Pass the receiver to the typing event
        }

        // Clear the previous timer
    clearTimeout(typingTimer);

    // Set a new timer to emit typing stopped after the delay
    typingTimer = setTimeout(() => {
        if (receiver) {
            socket.emit('typing', false, receiver); // Emit typing stopped with receiver
        }
    }, typingDelay);
});

// Listen for 'userTyping' event from the server
socket.on('userTyping', ({ isTyping, sender }) => {
    const mails = document.getElementsByClassName("icon-keyboard");

    // Check if there is at least one element with the class "icon-keyboard"
    if (mails.length > 0) {
        const mail = mails[0]; // Get the first element

        if (isTyping && sender !== currentUsername) {
            console.log("type");
            mail.classList.add('blink');
            // Optionally show typing indicator
            // typingIndicator.style.display = 'block';
            // typingIndicator.innerText = `${sender} is typing...`;
        } else {
            mail.classList.remove('blink');
            // Optionally hide typing indicator
            // typingIndicator.style.display = 'none';
        }
    }
});


function adjustMarginForScrollbar() {
    const chat = document.getElementById('chat');
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
