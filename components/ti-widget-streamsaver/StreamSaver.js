// initial copy https://github.com/jimmywarting/StreamSaver.js version 1.0.1
// modified by Texas Instruments to fix issues, simplify code (take out mitm concept) and adapt to GC context.

;((name, definition) => {
    'undefined' != typeof module ? module.exports = definition() :
    'function' == typeof define && 'object' == typeof define.amd ? define(definition) :
    this[name] = definition()
})('streamSaver', () => {
    'use strict'

    let
    iframe, loaded,
    secure = location.protocol == 'https:' || location.hostname == 'localhost' || location.hostname == '127.0.0.1',
    streamSaver = {
        createWriteStream,
        supported: false,
        version: {
            full: '1.0.0',
            major: 1, minor: 0, dot: 0
        }
    }

    //streamSaver.mitm = 'mitm.html?version=' + streamSaver.version.full

    try {
        streamSaver.supported = 'serviceWorker' in navigator && !!new ReadableStream() && !!new WritableStream()
    } catch(err) {
        // if you are running chrome < 52 then you can enable it
        // `chrome://flags/#enable-experimental-web-platform-features`
    }

    function sw_channel(data, ports) {
        navigator.serviceWorker.getRegistration(streamSaver.myurl).then(swReg => {
            return swReg || navigator.serviceWorker.register(streamSaver.myurl+'sw.js', {scope: streamSaver.myurl})
        }).then(swReg => {
            // This sends the message data as well as transferring
            // messageChannel.port2 to the service worker. The service worker can
            // then use the transferred port to reply via postMessage(), which
            // will in turn trigger the onmessage handler on messageChannel.port1.
            let swRegTmp = swReg.installing || swReg.waiting

            if (swReg.active) return swReg.active.postMessage(data, [ports[0]])

            swRegTmp.onstatechange = () => {
                if (swRegTmp.state === 'activated')
                    swReg.active.postMessage(data, [ports[0]])
            }
        })
    }

    function createWriteStream(filename, queuingStrategy, size) {
        if (Number.isFinite(queuingStrategy)) [size, queuingStrategy] = [queuingStrategy, size]

        let channel = new MessageChannel,
        popup,
        setupChannel = () => new Promise((resolve, reject) => {
            channel.port1.onmessage = evt => {
                if(evt.data.download) {
                    resolve()
                    if(!secure) popup.close() // don't need the popup any longer
                    let link = document.createElement('a')
                    let click = new MouseEvent('click')

                    link.href = evt.data.download
                    link.dispatchEvent(click)
                }
            }
            let nomitm = true;
            if (nomitm) {
                sw_channel({filename, size}, [channel.port2]);
            } else {
            if(secure && !iframe) {
                iframe = document.createElement('iframe')
                iframe.src = streamSaver.mitm
                iframe.hidden = true
                document.body.appendChild(iframe)
            }
            if(secure && !loaded) {
                let fn;
                iframe.addEventListener('load', fn = evt => {
                    loaded = true
                    iframe.removeEventListener('load', fn)
                    iframe.contentWindow.postMessage({filename, size}, '*', [channel.port2])
                })
            }
            if(secure && loaded) {
                iframe.contentWindow.postMessage({filename, size}, '*', [channel.port2])
            }
            if(!secure) {
                popup = window.open(streamSaver.mitm, Math.random())
                let onready = evt => {
                    if(evt.source === popup){
                        popup.postMessage({filename, size}, '*', [channel.port2])
                        removeEventListener('message', onready)
                    }
                }
                // Another problem that cross origin don't allow is scripting
                // so popup.onload() don't work but postMessage still dose
                // work cross origin
                addEventListener('message', onready)
            }
            } // end else testing
        })

        return new WritableStream({
            start(error) {
                // is called immediately, and should perform any actions
                // necessary to acquire access to the underlying sink.
                // If this process is asynchronous, it can return a promise
                // to signal success or failure.
                return setupChannel()
            },
            write(chunk) {
                // is called when a new chunk of data is ready to be written
                // to the underlying sink. It can return a promise to signal
                // success or failure of the write operation. The stream
                // implementation guarantees that this method will be called
                // only after previous writes have succeeded, and never after
                // close or abort is called.

                // TODO: Kind of important that service worker respond back when
                // it has been written. Otherwise we can't handle backpressure
                if (chunk && chunk.constructor === Uint8Array)  channel.port1.postMessage(chunk)
                else channel.port1.postMessage(new Uint8Array(chunk))
            },
            close() {
                channel.port1.postMessage('end')
            },
            abort(e) {
                channel.port1.postMessage('abort')
            }
        }, queuingStrategy)
    }

    return streamSaver
})
