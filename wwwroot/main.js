import { initViewer, loadModel } from './viewer.js';

const socket = io();
const presenter = new URLSearchParams(window.location.search).has('presenter');

initViewer(document.getElementById('preview')).then(viewer => {
    const urn = window.location.hash?.substring(1);
    setupModelSelection(viewer, urn);
    setupStateSharing(viewer);
});

function setupStateSharing(viewer) {
    if (presenter) {
        // If you're a presenter, send "update-state" message (max. once every 500ms)
        // with the URN of the current model, and the viewer state
        let lastUpdateTimestamp = Date.now();
        function sendStateUpdate() {
            if (Date.now() - lastUpdateTimestamp > 500) {
                console.log('Sending state update...');
                socket.emit('update-state', {
                    urn: viewer.model.getData().urn,
                    state: viewer.getState()
                });
                lastUpdateTimestamp = Date.now();
            }
        }
        viewer.addEventListener(Autodesk.Viewing.MODEL_ROOT_LOADED_EVENT, sendStateUpdate);
        viewer.addEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, sendStateUpdate);
        viewer.addEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, sendStateUpdate);
    } else {
        // If you're not a presenter, join a specific channel based on the URN
        // of the currently loaded model, and listen to "state-changed" messages
        let lastLoadedUrn = null;
        viewer.addEventListener(Autodesk.Viewing.MODEL_ROOT_LOADED_EVENT, function () {
            if (lastLoadedUrn) {
                console.log('Leaving channel for model', lastLoadedUrn);
                socket.emit('leave-channel', { urn: lastLoadedUrn });    
            }
            lastLoadedUrn = viewer.model.getData().urn;
            console.log('Joining channel for model', lastLoadedUrn);
            socket.emit('join-channel', { urn: lastLoadedUrn });
        });
        socket.on('state-changed', (state) => {
            console.log('Received state update...');
            viewer.restoreState(state, null, false);
        });
    }
}

async function setupModelSelection(viewer, selectedUrn) {
    const dropdown = document.getElementById('models');
    dropdown.innerHTML = '';
    try {
        const resp = await fetch('/api/models');
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const models = await resp.json();
        dropdown.innerHTML = models.map(model => `<option value=${model.urn} ${model.urn === selectedUrn ? 'selected' : ''}>${model.name}</option>`).join('\n');
        dropdown.onchange = () => onModelSelected(viewer, dropdown.value);
        if (dropdown.value) {
            onModelSelected(viewer, dropdown.value);
        }
    } catch (err) {
        alert('Could not list models. See the console for more details.');
        console.error(err);
    }
}

async function onModelSelected(viewer, urn) {
    window.location.hash = urn;
    loadModel(viewer, urn);
}
