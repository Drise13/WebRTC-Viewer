let ROLE = null; // Possible values: 'master', 'viewer', null
const LOG_LEVELS = ['debug', 'info', 'warn', 'error'];
let LOG_LEVEL = 'info'; // Possible values: any value of LOG_LEVELS

let viewers = {};

function configureLogging() {
    function log(level, messages) {
        const text = messages
            .map(message => {
                if (message instanceof Error) {
                    const { stack, ...rest } = message;
                    if (Object.keys(rest).length === 0) {
                        if (stack) {
                            return stack;
                        } else {
                            return message;
                        }
                    }
                    return `${JSON.stringify(rest, null, 2)}\n${stack}`;
                } else if (typeof message === 'object') {
                    return JSON.stringify(message, null, 2);
                } else if (message === undefined) {
                    return 'undefined';
                } else {
                    return message;
                }
            })
            .join(' ');

        const logLine = $(`<div class="${level.toLowerCase()}">`).text(`[${new Date().toISOString()}] [${level}] ${text}\n`);
        if (LOG_LEVELS.indexOf(LOG_LEVEL) > LOG_LEVELS.indexOf(level.toLowerCase())) {
            logLine.addClass('d-none');
        }
        $('#logs').append(logLine);
        const logsContainer = document.getElementById('logs');
        logsContainer.scrollTo(0, logsContainer.scrollHeight);
    }

    console._error = console.error;
    console.error = function(...rest) {
        log('ERROR', Array.prototype.slice.call(rest));
        console._error.apply(this, rest);
    };

    console._warn = console.warn;
    console.warn = function(...rest) {
        log('WARN', Array.prototype.slice.call(rest));
        console._warn.apply(this, rest);
    };

    console._log = console.log;
    console.log = function(...rest) {
        log('INFO', Array.prototype.slice.call(rest));
        console._log.apply(this, rest);
    };

    console._debug = console.debug;
    console.debug = function(...rest) {
        log('DEBUG', Array.prototype.slice.call(rest));
        console._debug.apply(this, rest);
    };
}

function getRandomClientId() {
    return Math.random()
        .toString(36)
        .substring(2)
        .toUpperCase();
}

function getFormValues() {
    return {
        region: $('#region').val(),
        channelName: $('#channelName').val(),
        channelsList: $('#channelsList').val(),
        clientId: $('#clientId').val() || getRandomClientId(),
        sendVideo: $('#sendVideo').is(':checked'),
        sendAudio: $('#sendAudio').is(':checked'),
        streamName: $('#streamName').val(),
        ingestMedia: $('#ingest-media').is(':checked'),
        showJSSButton: $('#show-join-storage-session-button').is(':checked'),
        openDataChannel: $('#openDataChannel').is(':checked'),
        widescreen: $('#widescreen').is(':checked'),
        fullscreen: $('#fullscreen').is(':checked'),
        useTrickleICE: $('#useTrickleICE').is(':checked'),
        natTraversalDisabled: $('#natTraversalDisabled').is(':checked'),
        forceSTUN: $('#forceSTUN').is(':checked'),
        forceTURN: $('#forceTURN').is(':checked'),
        accessKeyId: $('#accessKeyId').val(),
        endpoint: $('#endpoint').val() || null,
        secretAccessKey: $('#secretAccessKey').val(),
        sessionToken: $('#sessionToken').val() || null,
        enableDQPmetrics: $('#enableDQPmetrics').is(':checked'),
        sendHostCandidates: $('#send-host').is(':checked'),
        acceptHostCandidates: $('#accept-host').is(':checked'),
        sendRelayCandidates: $('#send-relay').is(':checked'),
        acceptRelayCandidates: $('#accept-relay').is(':checked'),
        sendSrflxCandidates: $('#send-srflx').is(':checked'),
        acceptSrflxCandidates: $('#accept-srflx').is(':checked'),
        sendPrflxCandidates: $('#send-prflx').is(':checked'),
        acceptPrflxCandidates: $('#accept-prflx').is(':checked'),
        sendTcpCandidates: $('#send-tcp').is(':checked'),
        acceptTcpCandidates: $('#accept-tcp').is(':checked'),
        sendUdpCandidates: $('#send-udp').is(':checked'),
        acceptUdpCandidates: $('#accept-udp').is(':checked'),
    };
}

function getChannelList(rawChannelList) {
    if (!rawChannelList) {
        return [];
    }

    return rawChannelList
        .split(';')
        .map(channel => channel.trim())
        .filter(channelName => channelName.length > 0);
}

function toggleDataChannelElements() {
    if (getFormValues().openDataChannel) {
        $('.datachannel').removeClass('d-none');
    } else {
        $('.datachannel').addClass('d-none');
    }
}

function onStatsReport(report) {
    // Only print these to the console, as this prints a LOT of stuff.
    console._debug('[STATS]', Object.fromEntries([...report.entries()]));
}

function onStop() {
    if (!ROLE) {
        return;
    }

    Object.values(viewers).forEach(({ viewer, element }) => {
        if (viewer) {
            viewer.stopViewer();
        }
        if (element) {
            element.remove();
        }
    });
    viewers = {};

    if (getFormValues().enableDQPmetrics) {
        $('#dqpmetrics').addClass('d-none');
        $('#webrtc-live-stats').addClass('d-none');
    }

    $('#form').removeClass('d-none');
    $('#stop-viewer-button').addClass('d-none');
    ROLE = null;
}

window.addEventListener('beforeunload', onStop);

window.addEventListener('error', function(event) {
    console.error(event.message);
    event.preventDefault();
});

window.addEventListener('unhandledrejection', function(event) {
    console.error(event.reason.toString());
    event.preventDefault();
});

configureLogging();

$('#openDataChannel').on('change', toggleDataChannelElements);
toggleDataChannelElements();

function printFormValues(formValues) {
    const copyOfForm = Object.assign({}, formValues);
    copyOfForm.accessKeyId = copyOfForm.accessKeyId.replace(/./g, '*');
    copyOfForm.secretAccessKey = copyOfForm.secretAccessKey.replace(/./g, '*');
    copyOfForm.sessionToken = copyOfForm.sessionToken?.replace(/./g, '*');
    console.log('[FORM_VALUES] Running the sample with the following options:', copyOfForm);
}

$('#clear-logs').click(() => {
    $('#logs').empty();
});

$('#viewer-button').click(async () => {
    const formValues = getFormValues();
    const channels = getChannelList(formValues.channelsList);
    const channelsInput = document.getElementById('channelsList');

    if (!channels.length) {
        if (channelsInput) {
            channelsInput.setCustomValidity('Enter at least one channel name.');
            channelsInput.reportValidity();
        }
        return;
    }

    if (channelsInput) {
        channelsInput.setCustomValidity('');
    }

    const form = $('#form');
    form.addClass('d-none');
    ROLE = 'viewer';
    $('#stop-viewer-button').removeClass('d-none');

    const mainElement = $('#viewer');
    const viewersContainer = $('#viewers'); // Container for all viewers
    viewersContainer.empty();
    viewers = {};
    const uniqueChannels = new Set(); // Set to keep track of unique channels
    let viewerCount = 0;

    // Function to create a viewer
    function createViewer(channelName, index) {
        const viewerId = `viewer-${index}`;
        const clonedViewer = mainElement.clone().attr('id', viewerId).removeClass('d-none').addClass('viewer-card');
        clonedViewer.prepend(`<h6 class="viewer-title">Channel: ${channelName}</h6>`);
        clonedViewer.find('.remote-view').attr('id', `remote-view-${index}`);
        clonedViewer.find('.local-message').attr('id', `local-message-${index}`);
        clonedViewer.find('.remote-message').attr('id', `remote-message-${index}`);
        clonedViewer.find('.send-message-button').attr('id', `send-message-${index}`);
        clonedViewer.find('.reconnect-button').attr('id', `reconnect-${index}`);
        viewersContainer.append(clonedViewer);
        setupSendMessageHandler(`#send-message-${index}`, `#local-message-${index}`, viewerId);
        setupReconnectHandler(`#reconnect-${index}`, viewerId);

        const remoteMessageElement = clonedViewer.find('.remote-message')[0];
        const viewerFormValues = { ...formValues, channelName: channelName, clientId: getRandomClientId() };

        viewers[viewerId] = {
            channelName,
            formValues: viewerFormValues,
            element: clonedViewer,
            remoteMessageElement,
        };

        startViewerConnection(viewerId);
    }

    channels.forEach(channelName => {
        if (!uniqueChannels.has(channelName)) {
            uniqueChannels.add(channelName);
            createViewer(channelName, viewerCount);
            viewerCount += 1;
        }
    });
});

$('#stop-viewer-button').click(onStop);

$('#create-channel-button').click(async () => {
    const formValues = getFormValues();

    createSignalingChannel(formValues);
});

function startViewerConnection(viewerId) {
    const viewerEntry = viewers[viewerId];
    if (!viewerEntry) {
        return Promise.resolve();
    }

    const remoteView = viewerEntry.element.find('.remote-view')[0];
    const remoteMessageElement = viewerEntry.remoteMessageElement || viewerEntry.element.find('.remote-message')[0];
    viewerEntry.remoteMessageElement = remoteMessageElement;

    viewerEntry.viewer = new Viewer(null, remoteView, viewerEntry.formValues, onStatsReport, event => {
        appendRemoteMessage(remoteMessageElement, event.data);
    });

    return viewerEntry.viewer.initialize();
}

function reconnectViewer(viewerId, buttonElement) {
    const viewerEntry = viewers[viewerId];
    if (!viewerEntry) {
        return;
    }

    if (buttonElement) {
        buttonElement.disabled = true;
    }

    if (viewerEntry.viewer) {
        viewerEntry.viewer.stopViewer();
    }

    viewerEntry.formValues = { ...viewerEntry.formValues, clientId: getRandomClientId() };

    const initPromise = startViewerConnection(viewerId);
    if (buttonElement) {
        Promise.resolve(initPromise).finally(() => {
            buttonElement.disabled = false;
        });
    }
}

function appendRemoteMessage(remoteMessageElement, message) {
    if (!remoteMessageElement) {
        return;
    }

    remoteMessageElement.appendChild(document.createTextNode(`${message}\n`));
    remoteMessageElement.scrollTop = remoteMessageElement.scrollHeight;
}

function setupSendMessageHandler(sendButtonSelector, localMessageSelector, viewerId) {
    $(sendButtonSelector).click(function() {
        const message = $(localMessageSelector).val();
        if (message) {
            const viewerEntry = viewers[viewerId];
            if (viewerEntry?.viewer && viewerEntry.viewer.sendViewerMessage(message)) {
                $(localMessageSelector).val('');
            }
        }
    });
}

function setupReconnectHandler(buttonSelector, viewerId) {
    $(buttonSelector).click(function() {
        reconnectViewer(viewerId, this);
    });
}

$('#more-logs').click(async () => {
    const logElement = $('#logs');
    logElement.height(logElement.height() + 50);
});

$('#less-logs').click(async () => {
    const logElement = $('#logs');
    logElement.height(Math.max(100, logElement.height() - 50));
});

async function logLevelSelected(event) {
    LOG_LEVEL = event.target.getAttribute('data-level').toLowerCase();

    // Change which button is selected
    for (const child of $('#tabs').children()) {
        child.setAttribute('class', event.target.id === child.id ? 'btn btn-primary' : 'btn btn-light');
    }

    // Make the logs hidden and shown based on the selected level
    $('#logs > div').each((idx, child) => {
        if (LOG_LEVELS.indexOf(LOG_LEVEL) <= LOG_LEVELS.indexOf(child.classList[0])) {
            child.classList.remove('d-none');
        } else {
            child.classList.add('d-none');
        }
    });
}

// Fetch regions
fetch('https://api.regional-table.region-services.aws.a2z.com/index.jsons')
    .then(res => {
        if (res.ok) {
            return res.json();
        }
        return Promise.reject(`${res.status}: ${res.statusText}`);
    })
    .then(data => {
        data?.prices
            ?.filter(serviceData => serviceData?.attributes['aws:serviceName'] === 'Amazon Kinesis Video Streams')
            .map(kinesisVideoServiceData => kinesisVideoServiceData?.attributes['aws:region'])
            .sort()
            .forEach(region => {
                $('#regionList').append(
                    $('<option>', {
                        value: region,
                        text: region,
                    }),
                );
            });
        $('#region').attr('list', 'regionList');
        console.log('[FETCH-REGIONS] Successfully fetched regions!');
    })
    .catch(err => {
        console.error('[FETCH-REGIONS] Encountered error fetching regions', err);
    });

// Region verification
$('#region').on('focusout', event => {
    const region = event.target.value;
    let found = false;
    let anyRegions = false;
    for (const child of $('dataList').children()) {
        anyRegions = true;
        if (child.value === region) {
            found = true;
            break;
        }
    }
    if (!anyRegions) {
        return;
    }

    const regionElement = $('#region');

    if (found) {
        regionElement.addClass('is-valid');
        regionElement.removeClass('is-invalid');
    } else {
        if (!region) {
            $('#region-invalid-feedback').text('Please enter a region!');
        } else {
            // The dataset used mentions that it does not guarantee accuracy. In the case that
            // it does not contain a certain region needed, we can still input regions needed.
            $('#region-invalid-feedback').text('This region is not in the list of fetched regions!');
            console.warn(`[REGION-VALIDATION] The region entered: \"${region}\" may be invalid!`);
        }

        regionElement.addClass('is-invalid');
        regionElement.removeClass('is-valid');
    }
});

async function printPeerConnectionStateInfo(event, logPrefix, remoteClientId) {
    const rtcPeerConnection = event.target;
    console.debug(logPrefix, 'PeerConnection state:', rtcPeerConnection.connectionState);
    if (rtcPeerConnection.connectionState === 'connected') {
        console.log(logPrefix, 'Connection to peer successful!');
        const stats = await rtcPeerConnection.getStats();
        if (!stats) return;

        rtcPeerConnection.getSenders().map(sender => {
            const trackType = sender.track?.kind;
            if (sender.transport) {
                const iceTransport = sender.transport.iceTransport;
                if (iceTransport) {
                    const logSelectedCandidate = () =>
                        console.debug(`Chosen candidate pair (${trackType || 'unknown'}):`, iceTransport.getSelectedCandidatePair());
                    iceTransport.onselectedcandidatepairchange = logSelectedCandidate;
                    logSelectedCandidate();
                }
            } else {
                console.error('Failed to fetch the candidate pair!');
            }
        });
    } else if (rtcPeerConnection.connectionState === 'failed') {
        if (remoteClientId) {
            removeViewerTrackFromMaster(remoteClientId);
        }
        console.error(logPrefix, `Connection to ${remoteClientId || 'peer'} failed!`);
        onPeerConnectionFailed();
    }
}

// Read/Write all of the fields to/from localStorage so that fields are not lost on refresh.
const urlParams = new URLSearchParams(window.location.search);
const fields = [
    { field: 'channelName', type: 'text' },
    { field: 'channelsList', type: 'text' },
    { field: 'clientId', type: 'text' },
    { field: 'region', type: 'text' },
    { field: 'accessKeyId', type: 'text' },
    { field: 'secretAccessKey', type: 'text' },
    { field: 'sessionToken', type: 'text' },
    { field: 'endpoint', type: 'text' },
    { field: 'sendVideo', type: 'checkbox' },
    { field: 'sendAudio', type: 'checkbox' },
    { field: 'streamName', type: 'text' },
    { field: 'ingest-media', type: 'checkbox' },
    { field: 'show-join-storage-session-button', type: 'checkbox' },
    { field: 'widescreen', type: 'radio', name: 'resolution' },
    { field: 'fullscreen', type: 'radio', name: 'resolution' },
    { field: 'openDataChannel', type: 'checkbox' },
    { field: 'useTrickleICE', type: 'checkbox' },
    { field: 'natTraversalEnabled', type: 'radio', name: 'natTraversal' },
    { field: 'forceSTUN', type: 'radio', name: 'natTraversal' },
    { field: 'forceTURN', type: 'radio', name: 'natTraversal' },
    { field: 'natTraversalDisabled', type: 'radio', name: 'natTraversal' },
    { field: 'enableDQPmetrics', type: 'checkbox' },
    { field: 'send-host', type: 'checkbox' },
    { field: 'accept-host', type: 'checkbox' },
    { field: 'send-relay', type: 'checkbox' },
    { field: 'accept-relay', type: 'checkbox' },
    { field: 'send-srflx', type: 'checkbox' },
    { field: 'accept-srflx', type: 'checkbox' },
    { field: 'send-prflx', type: 'checkbox' },
    { field: 'accept-prflx', type: 'checkbox' },
    { field: 'send-tcp', type: 'checkbox' },
    { field: 'accept-tcp', type: 'checkbox' },
    { field: 'send-udp', type: 'checkbox' },
    { field: 'accept-udp', type: 'checkbox' },
];

fields.forEach(({ field, type, name }) => {
    const id = '#' + field;

    // Read field from localStorage
    try {
        const localStorageValue = localStorage.getItem(field);
        if (localStorageValue) {
            if (type === 'checkbox' || type === 'radio') {
                $(id).prop('checked', localStorageValue === 'true');
            } else {
                $(id).val(localStorageValue);
            }
            $(id).trigger('change');
        }
    } catch (e) {
        /* Don't use localStorage */
    }

    // Read field from query string
    if (urlParams.has(field)) {
        paramValue = urlParams.get(field);
        if (type === 'checkbox' || type === 'radio') {
            $(id).prop('checked', paramValue === 'true');
        } else {
            $(id).val(paramValue);
        }
    }

    // Write field to localstorage on change event
    $(id).change(function() {
        try {
            if (type === 'checkbox') {
                localStorage.setItem(field, $(id).is(':checked'));
            } else if (type === 'radio') {
                fields
                    .filter(fieldItem => fieldItem.name === name)
                    .forEach(fieldItem => {
                        localStorage.setItem(fieldItem.field, fieldItem.field === field);
                    });
            } else {
                localStorage.setItem(field, $(id).val());
            }
        } catch (e) {
            /* Don't use localStorage */
        }
    });
});

/**
 * Determines whether the ICE Candidate should be added.
 * @param formValues Settings used.
 * @param candidate {RTCIceCandidate} iceCandidate to check
 * @returns true if the candidate should be added to the peerConnection.
 */
function shouldAcceptCandidate(formValues, candidate) {
    const { transport, type } = extractTransportAndType(candidate);

    if (!formValues.acceptUdpCandidates && transport === 'udp') {
        return false;
    }

    if (!formValues.acceptTcpCandidates && transport === 'tcp') {
        return false;
    }

    switch (type) {
        case 'host':
            return formValues.acceptHostCandidates;
        case 'srflx':
            return formValues.acceptSrflxCandidates;
        case 'relay':
            return formValues.acceptRelayCandidates;
        case 'prflx':
            return formValues.acceptPrflxCandidates;
        default:
            console.warn('ShouldAcceptICECandidate: Unknown candidate type:', candidate.type);
            return false;
    }
}

$('#natTraversalEnabled').on('click', () => {
    $('#accept-host').prop('checked', true);
    $('#send-host').prop('checked', true);
    $('#accept-relay').prop('checked', true);
    $('#send-relay').prop('checked', true);
    $('#accept-srflx').prop('checked', true);
    $('#send-srflx').prop('checked', true);
    $('#accept-prflx').prop('checked', true);
    $('#send-prflx').prop('checked', true);

    saveAdvanced();
});

$('#forceSTUN').on('click', () => {
    $('#accept-host').prop('checked', false);
    $('#send-host').prop('checked', false);
    $('#accept-relay').prop('checked', false);
    $('#send-relay').prop('checked', false);
    $('#accept-srflx').prop('checked', true);
    $('#send-srflx').prop('checked', true);
    $('#accept-prflx').prop('checked', false);
    $('#send-prflx').prop('checked', false);

    saveAdvanced();
});

$('#forceTURN').on('click', () => {
    $('#accept-host').prop('checked', false);
    $('#send-host').prop('checked', false);
    $('#accept-relay').prop('checked', true);
    $('#send-relay').prop('checked', true);
    $('#accept-srflx').prop('checked', false);
    $('#send-srflx').prop('checked', false);
    $('#accept-prflx').prop('checked', false);
    $('#send-prflx').prop('checked', false);

    saveAdvanced();
});

$('#natTraversalDisabled').on('click', () => {
    $('#accept-host').prop('checked', true);
    $('#send-host').prop('checked', true);
    $('#accept-relay').prop('checked', true);
    $('#send-relay').prop('checked', true);
    $('#accept-srflx').prop('checked', true);
    $('#send-srflx').prop('checked', true);
    $('#accept-prflx').prop('checked', true);
    $('#send-prflx').prop('checked', true);

    saveAdvanced();
});

function saveAdvanced() {
    $('#accept-host').trigger('change');
    $('#send-host').trigger('change');
    $('#accept-relay').trigger('change');
    $('#send-relay').trigger('change');
    $('#accept-srflx').trigger('change');
    $('#send-srflx').trigger('change');
    $('#accept-prflx').trigger('change');
    $('#send-prflx').trigger('change');
}

/**
 * Determines whether the ICE Candidate should be sent to the peer.
 * @param formValues Settings used.
 * @param candidate {RTCIceCandidate} iceCandidate to check
 * @returns true if the candidate should be sent to the peer.
 */
function shouldSendIceCandidate(formValues, candidate) {
    const { transport, type } = extractTransportAndType(candidate);

    if (!formValues.sendUdpCandidates && transport === 'udp') {
        return false;
    }

    if (!formValues.sendTcpCandidates && transport === 'tcp') {
        return false;
    }

    switch (type) {
        case 'host':
            return formValues.sendHostCandidates;
        case 'srflx':
            return formValues.sendSrflxCandidates;
        case 'relay':
            return formValues.sendRelayCandidates;
        case 'prflx':
            return formValues.sendPrflxCandidates;
        default:
            console.warn('ShouldSendICECandidate: Unknown candidate type:', candidate.type);
            return false;
    }
}

function randomString() {
    return Date.now().toString();
}

function extractTransportAndType(candidate) {
    const words = candidate.candidate.split(' ');

    if (words.length < 7) {
        console.error('Invalid ice candidate!', candidate);
        return false;
    }

    // https://datatracker.ietf.org/doc/html/rfc5245#section-15.1
    return { transport: words[2], type: words[7] };
}

$('#copy-logs').on('click', async function() {
    const logsResult = [];
    $('#logs')
        .children()
        // Only copy the logs that are visible
        .filter((_, element) => !element.getAttribute('class')?.includes('d-none'))
        .each(function() {
            logsResult.push(this.textContent);
        });
    navigator.clipboard.writeText(logsResult.join(''));
    $('#copy-tooltip').tooltip('show');
    $('#copy-logs').removeClass('btn-light');
    $('#copy-logs').addClass('btn-success');
    await new Promise(r => setTimeout(r, 1000));
    $('#copy-tooltip').tooltip('hide');
    $('#copy-logs').removeClass('btn-success');
    $('#copy-logs').addClass('btn-light');
});

$('#listStorageChannels').on('click', async function() {
    const formValues = getFormValues();
    listStorageChannels(formValues);
});

$('#update-media-storage-configuration-button').on('click', async function() {
    const formValues = getFormValues();
    updateMediaStorageConfiguration(formValues);
});

$('#describe-media-storage-configuration-button').on('click', async function() {
    const formValues = getFormValues();
    describeMediaStorageConfiguration(formValues);
});

$('#create-stream-modal').on('show.bs.modal', function() {
    // Set the stream name in the modal to the stream name.
    $('#create-stream-modal-stream-input').val($('#streamName').val());
});

$('#create-stream-modal-create-stream-button').on('click', async function() {
    await createStream({
        ...getFormValues(),
        streamName: $('#create-stream-modal-stream-input').val(),
        retentionInHours: $('#create-stream-modal-retention-input').val(),
    });
});

$('#join-storage-session-button').on('click', async function() {
    const formValues = getFormValues();
    joinStorageSessionManually(formValues);
});

// Enable tooltips
$(document).ready(function() {
    $('[data-toggle="tooltip"]').tooltip();

    // Except the copy-logs tooltip
    $('#copy-tooltip').tooltip({ trigger: 'manual' });
});

// The page is all setup. Hide the loading spinner and show the page content.
$('.loader').addClass('d-none');
$('#main').removeClass('d-none');
console.log('Page loaded');
