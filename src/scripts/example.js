document.addEventListener('DOMContentLoaded',function(){
    
    document.getElementById("clickToDial").addEventListener("click", clickToDial);
    document.getElementById("addAssociation").addEventListener("click", addAssociation);
    document.getElementById("addAttribute").addEventListener("click", addAttribute);
    document.getElementById('addTransferContext').addEventListener("click", addTransferContext);
    document.getElementById('updateUserStatus').addEventListener("click", updateUserStatus);
    document.getElementById('pickupInteraction').addEventListener("click", updateInteractionState);
    document.getElementById('securePauseInteraction').addEventListener("click", updateInteractionState);
    document.getElementById('disconnectInteraction').addEventListener("click", updateInteractionState);
    document.getElementById('holdInteraction').addEventListener("click", updateInteractionState);
    document.getElementById('muteInteraction').addEventListener("click", updateInteractionState);
    document.getElementById('updateAudioConfiguration').addEventListener("click", updateAudioConfiguration);
    document.getElementById('sendCustomNotification').addEventListener("click", sendCustomNotification);
    
    document.getElementById('view-interactionList').addEventListener("click", setView);
    document.getElementById('view-calllog').addEventListener("click", setView);
    document.getElementById('view-newInteraction').addEventListener("click", setView);
    document.getElementById('view-callback').addEventListener("click", setView);
    document.getElementById('view-settings').addEventListener("click", setView);

    // Store call logs in memory (no CRM needed!)
    var callLogDatabase = [];

    window.addEventListener("message", function(event) {
        try {
            var message = JSON.parse(event.data);
            if(message){
                if(message.type == "screenPop"){
                    document.getElementById("screenPopPayload").value = event.data;
                } else if(message.type == "processCallLog"){
                    // Display the payload in textarea (existing functionality)
                    document.getElementById("processCallLogPayLoad").value = event.data;
                    
                    console.log('Received processCallLog request:', message.data);
                    
                    var requestId = message.data.requestId;
                    var callLog = message.data.callLog;
                    var interactionId = message.data.interactionId;
                    var eventName = message.data.eventName;
                                        
                    // Extract custom attributes if they exist
                    var customAttributes = {};
                    if (callLog && callLog.fields) {
                        callLog.fields.forEach(function(field) {
                            if (field.id && field.value) {
                                customAttributes[field.id] = field.value;
                            }
                        });
                    }
                    
                    // Determine interaction type from callLog.mediaType
                    var interactionType = 'Unknown';
                    if (callLog && callLog.mediaType) {
                        // Map Genesys media types to friendly names
                        var typeMap = {
                            'call': 'Call',
                            'chat': 'Chat',
                            'email': 'Email',
                            'message': 'Message',
                            'callback': 'Callback'
                        };
                        interactionType = typeMap[callLog.mediaType.toLowerCase()] || callLog.mediaType;
                    }
                    
                    console.log('Interaction Type:', interactionType);
                    console.log('Custom Attributes Found:', Object.keys(customAttributes).length);
                    
                    try {
                        // Generate unique ID for this call log
                        var callLogId = 'CALL_' + Date.now();
                        
                        // Save to our in-memory database
                        var savedLog = {
                            id: callLogId,
                            callLog: callLog,
                            interactionId: interactionId,
                            interactionType: interactionType,
                            eventName: eventName,
                            customAttributes: customAttributes,
                            timestamp: new Date().toISOString(),
                            savedAt: new Date().toLocaleString()
                        };
                        
                        callLogDatabase.push(savedLog);
                        
                        console.log('Saved call log:', savedLog);
                        console.log('Custom Attributes:', customAttributes);
                        console.log('Total call logs stored:', callLogDatabase.length);
                        
                        // Show a quick notification (optional)
                        showNotification('Call log saved successfully! Event: ' + eventName);
                        
                        // Send SUCCESS response back to Genesys iframe
                        document.getElementById("softphone").contentWindow.postMessage(JSON.stringify({
                            type: 'processCallLogResponse',
                            data: {
                                requestId: requestId,
                                success: true,
                                id: callLogId
                            }
                        }), "*");
                        
                        console.log('Sent processCallLog success response');
                        
                    } catch (error) {
                        console.error('Error processing call log:', error);
                        
                        document.getElementById("softphone").contentWindow.postMessage(JSON.stringify({
                            type: 'processCallLogResponse',
                            data: {
                                requestId: requestId,
                                success: false,
                                error: error.message || 'Failed to save call log'
                            }
                        }), "*");
                    }
                    
                } else if(message.type == "openCallLog"){
                    document.getElementById("openCallLogPayLoad").value = event.data;
                    
                    console.log('Opening call log:', message.data);
                    
                    var callLog = message.data.callLog;
                    var interaction = message.data.interaction;
                    
                    // Extract interaction ID properly - FIX FOR [object Object]
                    var interactionId = null;
                    if (typeof interaction === 'string') {
                        interactionId = interaction;
                    } else if (interaction && typeof interaction === 'object') {
                        // Try multiple possible properties
                        interactionId = interaction.id || 
                                       interaction.conversationId || 
                                       interaction.interactionId;
                    }
                    
                    // If still no interactionId, try from callLog
                    if (!interactionId && callLog) {
                        interactionId = callLog.interactionId || 
                                       callLog.conversationId || 
                                       callLog.id;
                    }
                    
                    console.log('Extracted Interaction ID:', interactionId);
                    console.log('Original interaction object:', interaction);
                    
                    // Find the saved call log from our database
                    var savedLog = callLogDatabase.find(function(log) {
                        return log.id === (callLog && callLog.id) || 
                               log.interactionId === interactionId ||
                               (callLog && callLog.interactionId && log.interactionId === callLog.interactionId);
                    });
                    
                    console.log('Found saved log:', savedLog);
                    
                    // Show the call log in a modal window
                    if (savedLog) {
                        showCallLogModal(savedLog);
                    } else {
                        // If not found in database, create a temporary object with available data
                        var tempLog = { 
                            callLog: callLog, 
                            interaction: interaction,
                            interactionId: interactionId,
                            interactionType: (callLog && callLog.mediaType) ? 
                                           (callLog.mediaType.charAt(0).toUpperCase() + callLog.mediaType.slice(1)) : 
                                           'Unknown',
                            savedAt: new Date().toLocaleString(),
                            customAttributes: {}
                        };
                        
                        // Try to extract custom attributes from callLog
                        if (callLog && callLog.fields) {
                            callLog.fields.forEach(function(field) {
                                if (field.id && field.value) {
                                    tempLog.customAttributes[field.id] = field.value;
                                }
                            });
                        }
                        
                        showCallLogModal(tempLog);
                    }
                    
                } else if(message.type == "interactionSubscription"){
                    document.getElementById("interactionSubscriptionPayload").value = event.data;
                    
                    // Log interaction details for debugging
                    console.log('Interaction subscription received:', message.data);
                    
                } else if(message.type == "userActionSubscription"){
                    document.getElementById("userActionSubscriptionPayload").value = event.data;
                } else if(message.type == "notificationSubscription"){
                    document.getElementById("notificationSubscriptionPayload").value = event.data;
                } else if(message.type == "contactSearch") {
                    document.getElementById("searchText").innerHTML = ": " + message.data.searchString;
                    sendContactSearch();
                }
            }
        } catch(e) {
            console.error('Error parsing message:', e);
        }
    });

    // Function to show call log in a modal window
    function showCallLogModal(logData) {
        // Create modal overlay
        var modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';
        
        // Create modal content
        var modalContent = document.createElement('div');
        modalContent.style.cssText = 'background: white; padding: 30px; border-radius: 10px; max-width: 700px; max-height: 80vh; overflow: auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
        
        // Build the content
        var html = '<h2 style="margin-top: 0; color: #333;">Call Log Details</h2>';
        
        // Show interaction type with proper display
        var displayType = logData.interactionType || 'Unknown';
        var typeColor = displayType.toLowerCase().includes('call') || displayType.toLowerCase() === 'call' ? '#2196F3' : 
                       displayType.toLowerCase().includes('message') ? '#9C27B0' : '#FF9800';
        html += '<p style="color: ' + typeColor + '; margin: 5px 0; font-weight: bold; font-size: 16px;"><strong>Type:</strong> ' + displayType + '</p>';
        
        if (logData.savedAt) {
            html += '<p style="color: #666; margin: 5px 0;"><strong>Saved:</strong> ' + logData.savedAt + '</p>';
        }
        
        if (logData.eventName) {
            html += '<p style="color: #666; margin: 5px 0;"><strong>Event:</strong> ' + logData.eventName + '</p>';
        }
        
        // Display Interaction ID properly - FIX FOR [object Object]
        var displayInteractionId = logData.interactionId;
        
        // If interactionId is still an object, try to extract the ID
        if (displayInteractionId && typeof displayInteractionId === 'object') {
            displayInteractionId = displayInteractionId.id || 
                                  displayInteractionId.conversationId || 
                                  displayInteractionId.interactionId ||
                                  'Unable to extract ID';
        }
        
        // Final fallback
        if (!displayInteractionId || displayInteractionId === 'Unable to extract ID') {
            displayInteractionId = (logData.callLog && logData.callLog.interactionId) || 
                                  (logData.callLog && logData.callLog.conversationId) ||
                                  'Not available';
        }
        
        html += '<p style="color: #666; margin: 5px 0;"><strong>Interaction ID:</strong> ' + displayInteractionId + '</p>';
        
        if (logData.id) {
            html += '<p style="color: #666; margin: 5px 0;"><strong>Log ID:</strong> ' + logData.id + '</p>';
        }
        
        // Display Custom Attributes if available
        if (logData.customAttributes && Object.keys(logData.customAttributes).length > 0) {
            html += '<hr style="margin: 20px 0;">';
            html += '<h3 style="color: #333;">✅ Custom Attributes Found:</h3>';
            html += '<div style="background: #e8f5e9; padding: 15px; border-radius: 5px; margin-bottom: 15px; border-left: 4px solid #4CAF50;">';
            for (var key in logData.customAttributes) {
                var value = logData.customAttributes[key];
                // Handle case where value might be an object
                if (typeof value === 'object' && value !== null) {
                    value = JSON.stringify(value);
                }
                html += '<p style="margin: 5px 0;"><strong>' + key + ':</strong> ' + value + '</p>';
            }
            html += '</div>';
        } else {
            html += '<hr style="margin: 20px 0;">';
            html += '<div style="background: #fff3e0; padding: 15px; border-radius: 5px; margin-bottom: 15px; border-left: 4px solid #FF9800;">';
            html += '<h3 style="color: #f57c00; margin-top: 0;">⚠️ No Custom Attributes Found</h3>';
            html += '<p style="margin: 5px 0; color: #666;">For <strong>voice calls</strong>: Set attributes in Architect call flow using "Set Participant Data" action.</p>';
            html += '<p style="margin: 5px 0; color: #666;">For <strong>web messaging</strong>: Set attributes when starting the conversation or in pre-chat form.</p>';
            html += '</div>';
        }
        
        // Display interaction details if available
        if (logData.callLog) {
            html += '<hr style="margin: 20px 0;">';
            html += '<h3 style="color: #333;">Interaction Details:</h3>';
            
            var callLogData = logData.callLog;
            
            // Extract and display key information
            if (callLogData.participants && callLogData.participants.length > 0) {
                html += '<div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 10px;">';
                html += '<h4 style="margin-top: 0;">Participants:</h4>';
                callLogData.participants.forEach(function(participant) {
                    if (participant.displayName || participant.phoneNumber) {
                        html += '<p style="margin: 5px 0;">• ' + 
                               (participant.displayName || 'Unknown') + 
                               (participant.phoneNumber ? ' (' + participant.phoneNumber + ')' : '') + 
                               '</p>';
                    }
                });
                html += '</div>';
            }
            
            if (callLogData.startTime) {
                html += '<p style="margin: 5px 0;"><strong>Start Time:</strong> ' + new Date(callLogData.startTime).toLocaleString() + '</p>';
            }
            
            if (callLogData.endTime) {
                html += '<p style="margin: 5px 0;"><strong>End Time:</strong> ' + new Date(callLogData.endTime).toLocaleString() + '</p>';
            }
            
            if (callLogData.duration) {
                html += '<p style="margin: 5px 0;"><strong>Duration:</strong> ' + Math.floor(callLogData.duration / 1000) + ' seconds</p>';
            }
            
            if (callLogData.direction) {
                html += '<p style="margin: 5px 0;"><strong>Direction:</strong> ' + callLogData.direction + '</p>';
            }
        }
        
        html += '<hr style="margin: 20px 0;">';
        html += '<h3 style="color: #333;">Full Call Log Data:</h3>';
        html += '<pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; overflow: auto; max-height: 300px; font-size: 11px;">' + 
                JSON.stringify(logData.callLog || logData, null, 2) + 
                '</pre>';
        
        html += '<div style="margin-top: 20px; text-align: right;">';
        html += '<button id="closeModal" style="background: #fc4100; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px;">Close</button>';
        html += '</div>';
        
        modalContent.innerHTML = html;
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Close modal on button click or overlay click
        document.getElementById('closeModal').addEventListener('click', function() {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    // Function to show notifications
    function showNotification(message) {
        var notification = document.createElement('div');
        notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 15px 20px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); z-index: 9999;';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(function() {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 3000);
    }

    function clickToDial() {
        console.log('process click to dial');
        document.getElementById("softphone").contentWindow.postMessage(JSON.stringify({
            type: 'clickToDial',
            data: { number: '3172222222', autoPlace: true }
        }), "*");
    }

    function addAssociation() {
        console.log('process add association');
        document.getElementById("softphone").contentWindow.postMessage(JSON.stringify({
            type: 'addAssociation',
            data: JSON.parse(document.getElementById("associationPayload").value)
        }), "*");
    }

    function addAttribute() {
        console.log('process add attribute');
        var attributeData = JSON.parse(document.getElementById("attributePayload").value);
        
        // Log what we're sending
        console.log('Adding custom attributes:', attributeData);
        
        document.getElementById("softphone").contentWindow.postMessage(JSON.stringify({
            type: 'addAttribute',
            data: attributeData
        }), "*");
        
        // Show confirmation
        showNotification('Custom attributes added to interaction!');
    }

    function addTransferContext() {
        console.log('process add Transfer Context');
        document.getElementById("softphone").contentWindow.postMessage(JSON.stringify({
            type: 'addTransferContext',
            data: JSON.parse(document.getElementById("transferContextPayload").value)
        }), "*");
    }

    function sendContactSearch() {
        console.log('process add Search Context');
        document.getElementById("softphone").contentWindow.postMessage(JSON.stringify({
            type: 'sendContactSearch',
            data: JSON.parse(document.getElementById("contactSearchPayload").value)
        }), "*");
    }

    function updateUserStatus() {
        console.log('process user status update');
        document.getElementById("softphone").contentWindow.postMessage(JSON.stringify({
            type: 'updateUserStatus',
            data: { id:document.getElementById("statusDropDown").value }
        }), "*");
    }

    function updateInteractionState(event) {
        console.log('process interaction state change');
        var lastInteractionPayload = JSON.parse(document.getElementById("interactionSubscriptionPayload").value);
        var interactionId;
        if (lastInteractionPayload.data.interaction.old){
            interactionId = lastInteractionPayload.data.interaction.old.id;
        }else {
            interactionId = lastInteractionPayload.data.interaction.id;
        }
        let payload = {
            action: event.target.outerText,
            id: interactionId
        };
        document.getElementById("softphone").contentWindow.postMessage(JSON.stringify({
            type: 'updateInteractionState',
            data: payload
        }), "*");
    }

    function updateAudioConfiguration(){
        console.log('Update Audio Configuration');
        var payload = {
            call: document.getElementById('audio-call').checked,
            chat: document.getElementById('audio-chat').checked,
            email: document.getElementById('audio-email').checked,
            callback: document.getElementById('audio-callback').checked,
            message: document.getElementById('audio-message').checked,
            voicemail: document.getElementById('audio-voicemail').checked
        }
        document.getElementById("softphone").contentWindow.postMessage(JSON.stringify({
            type: 'updateAudioConfiguration',
            data: payload
        }), "*");
    }

    function setView(event) {
        console.log('process view update');
        let payload = {
            type:"main", 
            view: {
                name:event.target.outerText
            }
        };
        document.getElementById("softphone").contentWindow.postMessage(JSON.stringify({
            type: 'setView',
            data: payload
        }), "*");
    }

    function sendCustomNotification(){
        console.log('Send Custom User Notification');
        var payload = {
            message: document.getElementById('customNotificationMessage').value,
            type: document.getElementById('notificationType').value,  
            timeout: document.getElementById('notificationTimeout').value
        };
        document.getElementById("softphone").contentWindow.postMessage(JSON.stringify({
            type: 'sendCustomNotification',
            data: payload
        }), "*");
    }
})