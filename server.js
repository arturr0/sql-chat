require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const uploadsDir = path.join(__dirname, 'uploads'); // Adjust the path according to your project structure

app.use('/uploads', express.static(uploadsDir)); // Serve images from the uploads directory
//app.use('/uploads', express.static('uploads'));

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Serve static files from the uploads directory
//app.use('/uploads', express.static(uploadsDir));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const db = new sqlite3.Database('chat.db');
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');


// Initialize multer with the defined storage


// Handle file upload route

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir); // Set the destination to 'uploads' directory
    },
    filename: function (req, file, cb) {
        const uniqueFileName = `uploaded_image_${Date.now()}_${file.originalname}`;
        cb(null, uniqueFileName);
    }
});
const upload = multer({ storage: storage });

// Handle file uploads
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    // Send the uploaded file path
    res.json({ filePath: `/uploads/${req.file.filename}` });
});

// Encryption/Decryption functions
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // Use Buffer to create key from hex
const IV_LENGTH = 16; // For AES, this is always 16

// Function to encrypt a message
function encrypt(text) {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex'); // Store IV with the encrypted message
}

// Function to decrypt a message
function decrypt(text) {
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}


// db.close((err) => {
//     if (err) {
//         console.error('Error closing the database connection:', err.message);
//     } else {
//         console.log('Database connection closed.');
//         // Now delete the file
        
//     }
// });

// Initialize the SQLite database
 db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        socketId TEXT,
        receiver INTEGER,
        profileImage BLOB,
        FOREIGN KEY (receiver) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        senderId INTEGER,
        recId INTEGER,
        message TEXT,
        read INTEGER NOT NULL,
        FOREIGN KEY (senderId) REFERENCES users(id),
        FOREIGN KEY (recId) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS blocked (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        blocker INTEGER,
        blocked INTEGER,
        FOREIGN KEY (blocker) REFERENCES users(id),
        FOREIGN KEY (blocked) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS friends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inviting INTEGER,
        invited INTEGER,
        accepted INTEGER NOT NULL,
        FOREIGN KEY (inviting) REFERENCES users(id),
        FOREIGN KEY (invited) REFERENCES users(id)
    )`, (err) => {
        if (err) {
            console.error('Error creating friends table:', err);
        }
    });
});




// Serve the authorization page
app.get('/', (req, res) => {
    res.render('index');
});

// Serve the chat page (after authentication)
app.get('/chat', (req, res) => {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect('/'); // Redirect to login if not authenticated
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.redirect('/'); // Redirect to login if token is invalid
        }
        res.render('chat'); // Render chat.pug for authenticated users
    });
});

// User registration
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).json({ message: 'Server error' });

        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash], function (err) {
            if (err) return res.status(500).json({ message: 'User already exists' });
            res.status(200).json({ message: 'User registered successfully' });
        });
    });
});

// User login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user) return res.status(401).json({ message: 'Invalid username or password' });

        bcrypt.compare(password, user.password, (err, match) => {
            if (err || !match) return res.status(401).json({ message: 'Invalid username or password' });

            const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
            res.cookie('token', token, {
                httpOnly: true, 
                secure: true, 
                sameSite: 'None', // Explicitly set the SameSite attribute to 'None'
                maxAge: 3600000 // 1 hour in milliseconds
            });
            
            res.status(200).json({ message: 'Login successful' });
        });
    });
});

// Socket.IO handling
io.on('connection', (socket) => {
    //console.log('A user connected with socket ID:', socket.id);
    
    // Socket listener for chat messages
    socket.on('chatMessage', ({ username, messageSent, receiver }) => {
        // Find sender's ID using socketId
        db.get('SELECT id FROM users WHERE socketId = ?', [socket.id], (err, sender) => {
            if (err || !sender) {
                console.error('Sender not found for socket:', socket.id);
                return;
            }
    
            // Find receiver's ID by username
            db.get('SELECT id, socketId FROM users WHERE username = ?', [receiver], (err, rec) => {
                if (err || !rec) {
                    console.error('Receiver not found:', receiver);
                    return;
                }
    
                console.log(`Checking block status between sender: ${sender.id} and receiver: ${rec.id}`);
    
                // Check if either the sender or receiver has blocked the other
                db.get(`
                    SELECT 1 
                    FROM blocked 
                    WHERE (blocker = ? AND blocked = ?) 
                       OR (blocker = ? AND blocked = ?)`,
                    [sender.id, rec.id, rec.id, sender.id],
                    (err, blocked) => {
                        if (err) {
                            console.error('Error checking block status:', err);
                            return;
                        }
    
                        if (blocked) {
                            // If blocked, do not send or store the message
                            console.log(`Message blocked: Sender ${username} is blocked from sending to ${receiver}`);
                            socket.emit('messageBlocked', { message: 'Message blocked due to user restrictions.' });
                            return;
                        }
    
                        // Encrypt the message
                        const encryptedMessage = encrypt(messageSent);
    
                        // Log the encrypted message to verify
                        console.log('Encrypted message being sent:', encryptedMessage);
    
                        // Insert encrypted message into database
                        db.run('INSERT INTO messages (senderId, recId, message, read) VALUES (?, ?, ?, ?)', 
                            [sender.id, rec.id, encryptedMessage, 0], (err) => {
                                if (err) {
                                    console.error('Error saving message:', err);
                                    return;
                                }
    
                                // Send encrypted message to receiver
                                io.to(rec.socketId).emit('message', { user: username, message: messageSent }); // Send original message
                            });
                    }
                );
            });
        });
    });
    

// Handle requests for previous messages
socket.on('sendMeMessages', (username, receiver) => {
    // Retrieve ID of the sender (username)
    db.get('SELECT id FROM users WHERE username = ?', [username], (err, sender) => {
        if (err || !sender) {
            console.error('Error finding sender:', err);
            return;
        }

        // Retrieve ID of the receiver (receiver)
        db.get('SELECT id FROM users WHERE username = ?', [receiver], (err, receiver) => {
            if (err || !receiver) {
                console.error('Error finding receiver:', err);
                return;
            }

            // Query messages between the sender and receiver
            db.all(`
                SELECT messages.message, 
                       sender.username AS senderUsername, 
                       receiver.username AS receiver 
                FROM messages 
                JOIN users AS sender ON messages.senderId = sender.id 
                JOIN users AS receiver ON messages.recId = receiver.id 
                WHERE (messages.senderId = ? AND messages.recId = ?) 
                   OR (messages.senderId = ? AND messages.recId = ?)`,
                [sender.id, receiver.id, receiver.id, sender.id],
                (err, messages) => {
                    if (err) {
                        console.error('Error fetching messages:', err);
                        return;
                    }

                    // Decrypt each message
                    const decryptedMessages = messages.map(msg => {
                        try {
                            return {
                                message: decrypt(msg.message), // Decrypt the message text
                                senderUsername: msg.senderUsername,
                                receiver: msg.receiver
                            };
                        } catch (decryptionError) {
                            console.error('Error decrypting message:', decryptionError);
                            return null; // Skip the message if it fails to decrypt
                        }
                    }).filter(msg => msg !== null); // Filter out null (failed decryption)

                    // Log decrypted messages to verify they are correctly decrypted
                    console.log('Decrypted messages to send:', decryptedMessages);

                    // Send the array of decrypted messages to the client
                    socket.emit('messagesResponse', decryptedMessages);
                }
            );
        });
    });
});

    
    
    
    
    socket.on('typing', (isTyping, receiver) => {
        console.log(receiver);
    
        // Find sender's username by socket ID
        db.get('SELECT username FROM users WHERE socketId = ?', [socket.id], (err, sender) => {
            if (err || !sender) {
                console.error('Sender not found for socket:', socket.id);
                return;
            }
    
            // Find receiver's socket ID by username
            db.get('SELECT socketId FROM users WHERE username = ?', [receiver], (err, rec) => {
                if (err || !rec) {
                    console.error('Receiver not found:', receiver);
                    return;
                }
    
                // Emit the typing event to the receiver, with the sender's username
                io.to(rec.socketId).emit('userTyping', { isTyping, sender: sender.username });
            });
        });
    });
    
    socket.on('login', (username) => {
        db.get('SELECT id, profileImage FROM users WHERE username = ?', [username], (err, user) => {
            if (err || !user) {
                console.error('User not found:', username);
                return;
            }
    
            // Update the user's socket ID
            db.run('UPDATE users SET socketId = ? WHERE id = ?', [socket.id, user.id], (err) => {
                if (err) {
                    console.error('Error updating socket ID:', err);
                    return;
                }
    
                // Now that the socket ID is updated, fetch the user again
                db.get('SELECT id, profileImage FROM users WHERE socketId = ?', [socket.id], (err, updatedUser) => {
                    if (err || !updatedUser) {
                        console.error('Updated user not found:', err);
                        return;
                    }
    
                    // Emit user info including profile image if it exists
                    io.to(socket.id).emit('user info', {
                        id: updatedUser.id,
                        profileImage: updatedUser.profileImage || null // Send the path or null if it doesn't exist
                    });
    
                    // Query the friends table for any invitations where this user is invited
                    db.all('SELECT inviting FROM friends WHERE invited = ? AND accepted = 0', [updatedUser.id], (err, rows) => {
                        if (err) {
                            console.error('Error fetching invitations:', err);
                            return;
                        }
    
                        // If there are pending invitations, send them to the user
                        if (rows.length > 0) {
                            rows.forEach(row => {
                                db.get('SELECT username FROM users WHERE id = ?', [row.inviting], (err, invitingUser) => {
                                    if (err) {
                                        console.error('Error fetching inviting user:', err);
                                        return;
                                    }
    
                                    // Emit the invitation to the invited user
                                    io.to(socket.id).emit('send invitation', {
                                        from: invitingUser.username,
                                        message: `You have received an invitation from ${invitingUser.username}.`,
                                        id: row.inviting // Send the inviting user's ID
                                    });
                                });
                            });
                        }
                    });
                });
            });
        });
    });
    
    
    
    
    // socket.on('chatMessage', ({ message }) => {
    //     db.get('SELECT id FROM users WHERE socketId = ?', [socket.id], (err, user) => {
    //         if (err || !user) {
    //             console.error('User not found for socket:', socket.id);
    //             return;
    //         }

    //         const encryptedMessage = encrypt(message);
    //         db.run('INSERT INTO messages (senderId, message) VALUES (?, ?)', [user.id, encryptedMessage], (err) => {
    //             if (err) {
    //                 console.error('Error saving message:', err);
    //                 return;
    //             }

    //             db.get('SELECT message FROM messages WHERE senderId = ? ORDER BY id DESC LIMIT 1', [user.id], (err, row) => {
    //                 if (err) {
    //                     console.error('Error retrieving message:', err);
    //                     return;
    //                 }

    //                 const decryptedMessage = decrypt(row.message);
    //                 io.to(socket.id).emit('message', { user: user.username, message: decryptedMessage });
    //             });
    //         });
    //     });
    // });
    socket.on('findUsers', async (searchUser) => {
        console.log("Searching for user:", searchUser);
        try {
            const founded = await findBlocked(searchUser, socket.id);
            socket.emit('foundUsers', founded);
        } catch (error) {
            console.error("Error finding users:", error);
            socket.emit('searchError', { message: 'Failed to find users.' });
        }
    });
    
    async function areUsersBlocked(invitingId, invitedId) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM blocked WHERE (blocker = ? AND blocked = ?) OR (blocker = ? AND blocked = ?)',
                [invitingId, invitedId, invitedId, invitingId],
                (err, row) => {
                    if (err) {
                        reject('Error checking block status');
                    } else if (row) {
                        reject('Blocked: One user has blocked the other');
                        socket.emit('inviteProcessed');
                    } else {
                        resolve(true); // No block found
                        socket.emit('inviteProcessed');
                    }
                });
        });
    }
    socket.on('invite', async (invitedUser) => {
        console.log("Processing invite...");

        // Find the ID and username of the inviting user
        db.get('SELECT id, username FROM users WHERE socketId = ?', [socket.id], (err, inviting) => {
            if (err || !inviting) {
                console.error('Error finding inviting user:', err);
                return;
            }

            // Find the ID and socketId of the invited user
            db.get('SELECT id, socketId FROM users WHERE username = ?', [invitedUser], async (err, invited) => {
                if (err || !invited) {
                    console.error('Error finding invited user:', err);
                    return;
                }

                // Check if either user has blocked the other
                try {
                    await areUsersBlocked(inviting.id, invited.id);
                } catch (error) {
                    console.error(error);
                    socket.emit('blockError', { message: 'You cannot invite this user.' });
                    return; // Exit if blocked
                }

                // Check if the invited user has already been invited
                db.get('SELECT * FROM friends WHERE inviting = ? AND invited = ?', [inviting.id, invited.id], (err, existingInvite) => {
                    if (err) {
                        console.error('Error checking invitation status:', err);
                        return;
                    }

                    if (existingInvite) {
                        socket.emit('inviteError', { message: 'Invitation already sent.' });
                        return; // Exit if already invited
                    }
                    console.log("insert");
                    // Insert into the friends table with accepted set to 0 (pending)
                    db.run('INSERT INTO friends (inviting, invited, accepted) VALUES (?, ?, 0)', [inviting.id, invited.id], (err) => {
                        if (err) {
                            console.error('Error inserting into friends table:', err);
                        } else {
                            console.log(`User ${inviting.username} invited ${invitedUser}`);

                            // Send invitation to the invited user using their socketId
                            if (invited.socketId) {
                                io.to(invited.socketId).emit('send invitation', {
                                    from: inviting.username,
                                    id: inviting.id,
                                    message: `You have received an invitation from user ${inviting.username}.`
                                });
                            } else {
                                console.error('Invited user does not have a valid socketId.');
                            }

                            // Emit a custom event to signal that the invite is processed
                            console.log('check inviteProcessed')
                            
                        }
                    });
                });
            });
        });
    });
    
    
    socket.on('confirm invite', ({ decision, invitingId }) => {
        // Find the ID of the invited user based on the socket ID
        db.get('SELECT id FROM users WHERE socketId = ?', [socket.id], (err, invited) => {
            if (err || !invited) {
                console.error('Invited user not found:', err);
                return;
            }
    
            if (decision) {
                // Update accepted to 1
                db.run('UPDATE friends SET accepted = 1 WHERE inviting = ? AND invited = ?', [invitingId, invited.id], (err) => {
                    if (err) {
                        console.error('Error updating friends table:', err);
                    } else {
                        //console.log(`Invitation accepted by user ${invited.id}`);
                    }
                });
            } else {
                // Remove the row if not accepted
                db.run('DELETE FROM friends WHERE inviting = ? AND invited = ?', [invitingId, invited.id], (err) => {
                    if (err) {
                        console.error('Error deleting from friends table:', err);
                    } else {
                        //console.log(`Invitation rejected by user ${invited.id}`);
                    }
                });
            }
        });
    });
    
    socket.on('receiver', (receiver) => {
        const currentSocketId = socket.id;
    
        // Find the sender (current user) based on the socket ID
        db.get(`SELECT id FROM users WHERE socketId = ?`, [currentSocketId], (err, senderRow) => {
            if (err || !senderRow) {
                console.error('Error finding sender:', err);
                return;
            }
    
            const senderId = senderRow.id;
    
            // Find the receiver's ID based on the receiver's username
            db.get(`SELECT id FROM users WHERE username = ?`, [receiver], (err, receiverRow) => {
                if (err || !receiverRow) {
                    console.error('Error finding receiver:', err);
                    return;
                }
    
                const receiverId = receiverRow.id;
    
                // Update the sender's receiver field
                db.run(`UPDATE users SET receiver = ? WHERE id = ?`, [receiverId, senderId], (err) => {
                    if (err) {
                        console.error('Error updating receiver for sender:', err);
                    } else {
                        console.log('Receiver set successfully for sender with socketId:', currentSocketId);
                    }
                });
            });
        });
    });
    // socket.on('message', function(message) {
    //     // Save the binary data to a file
    //     fs.writeFile('uploaded_image.jpg', message, function(err) {
    //         if (err) throw err;
    //         console.log('The image has been saved!');
    
    //         // Broadcast the image to all users
    //         io.emit('newImage', message);  // Emit with 'newImage' event
    //     });
    // });
    const fs = require('fs');
const path = require('path'); // Ensure this is imported

socket.on('uploadImage', ({ imageData, fileType }) => {
    if (!fileType) {
        console.error('No file type provided!');
        return;
    }

    // Extract the file extension from fileType
    const extension = fileType.split('/')[1]; // This will extract 'png', 'jpeg', etc.

    // Ensure extension is valid before proceeding
    const validExtensions = ['jpeg', 'jpg', 'png', 'gif', 'bmp', 'svg', 'webp'];
    if (!validExtensions.includes(extension)) {
        console.error('Unsupported file type:', extension);
        return;
    }

    const uniqueFileName = `uploaded_image_${socket.id}_${Date.now()}.${extension}`;
    const uploadsDir = path.join(__dirname, 'uploads'); // Correctly join the uploads directory path
    const filePath = path.join(uploadsDir, uniqueFileName); // Correctly create the full path to save the image

    // Decode the base64 data
    const base64Data = imageData; // Already in base64 format from Data URL

    // Save the binary image data to a file
    fs.writeFile(filePath, base64Data, 'base64', (err) => {
        if (err) {
            console.error('Error saving the image:', err);
            return;
        }
        console.log('Image saved successfully:', filePath);

        // Update user's profile image in the database
        const relativePath = `/uploads/${uniqueFileName}`; // Use relative path for database
        db.run(`UPDATE users SET profileImage = ? WHERE socketId = ?`, [relativePath, socket.id], (err) => {
            if (err) {
                console.error('Error updating profile image:', err);
                return;
            }

            // Broadcast the new image to all users
            //io.emit('newImage', relativePath);
            socket.emit("avatar", relativePath);
        });
    });
});






socket.on('block', (blockedUsername, callback) => {
    // Find the username of the user who is blocking
    db.get('SELECT username FROM users WHERE socketId = ?', [socket.id], (err, blocker) => {
        if (err || !blocker) {
            console.error('Blocker not found:', err);
            return callback({ success: false, error: 'Blocker not found' });
        }

        // Find the ID and socketId of the user being blocked
        db.get('SELECT id, socketId FROM users WHERE username = ?', [blockedUsername], (err, blocked) => {
            if (err || !blocked) {
                console.error('Blocked user not found:', err);
                return callback({ success: false, error: 'Blocked user not found' });
            }

            // Insert into the blocked table using the username of the blocker
            db.run('INSERT INTO blocked (blocker, blocked) VALUES ((SELECT id FROM users WHERE username = ?), ?)', [blocker.username, blocked.id], function(err) {
                if (err) {
                    console.error('Error inserting into blocked table:', err);
                    return callback({ success: false, error: 'Database error' });
                }

                // Remove the friendship if it exists
                db.run('DELETE FROM friends WHERE (inviting = (SELECT id FROM users WHERE username = ?) AND invited = ?) OR (inviting = ? AND invited = (SELECT id FROM users WHERE username = ?))', 
                    [blocker.username, blocked.id, blocked.id, blocker.username], (err) => {
                    if (err) {
                        console.error('Error removing friendship:', err);
                        return callback({ success: false, error: 'Database error' });
                    }
                });

                // Check if the blocked user has an active socket connection
                if (blocked.socketId) {
                    // Send a message to the blocked user if they are online
                    io.to(blocked.socketId).emit('blockedNotification', blocker.username);
                } else {
                    console.log(`Blocked user ${blockedUsername} is not currently online.`);
                }

                // Notify the client about the successful block and invoke the callback
                callback({ success: true, message: `You have blocked ${blockedUsername}` });
            });
        });
    });
});


    socket.on('disconnect', () => {
        // Update both socketId and receiver to NULL when a user disconnects
        db.run('UPDATE users SET socketId = NULL, receiver = NULL WHERE socketId = ?', [socket.id], (err) => {
            if (err) {
                console.error('Error clearing socket ID and receiver:', err);
            }
        });
    });
    
    function findBlocked(searchUser, socketId) {
        return new Promise((resolve, reject) => {
            // Find the sender by their socket ID
            db.get('SELECT id FROM users WHERE socketId = ?', [socketId], (err, sender) => {
                if (err || !sender) {
                    console.error('Sender not found:', err);
                    return reject(err);
                }
    
                // SQL query to find users excluding the sender and those they have blocked, and adding isFriend status
                const query = `
                    SELECT u.id, u.username, u.socketId, u.profileImage,  -- Include profileImage
                    CASE
                        WHEN EXISTS (
                            SELECT 1 FROM friends
                            WHERE (friends.inviting = u.id AND friends.invited = ?)  -- Sender is invited
                            OR (friends.invited = u.id AND friends.inviting = ?)     -- Sender is inviting
                        ) THEN 1
                        ELSE 0
                    END AS isFriend
                    FROM users u
                    WHERE u.username LIKE ? COLLATE NOCASE  -- 3rd placeholder
                    AND u.id != ?  -- Exclude the sender themselves
                    AND u.id NOT IN (
                        -- Exclude users who have blocked the sender
                        SELECT blocker FROM blocked WHERE blocked = ?  -- 4th placeholder
                    )
                    AND u.id NOT IN (
                        -- Exclude users blocked by the sender
                        SELECT blocked FROM blocked WHERE blocker = ?  -- 5th placeholder
                    );
                `;
    
                // Execute the query
                db.all(query, [`${sender.id}`, `${sender.id}`, `%${searchUser}%`, sender.id, sender.id, sender.id], (err, rows) => {
                    if (err) {
                        console.error(err);
                        return reject(err);
                    }
    
                    // Map through rows to add image file names
                    const modifiedRows = rows.map(row => {
                        const fileName = row.profileImage; // Extract filename or use default
                        return {
                            ...row, // Spread original row properties
                            profileImage: fileName // Replace profileImage with just the filename
                        };
                    });
    
                    resolve(modifiedRows);  // Resolve with the modified rows including filenames
                });
            });
        });
    }
    
    
    
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    //console.log(`Server is listening on port ${PORT}`);
});

