/*
 * Copyright (c) 2017, Texas Instruments Incorporated
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * *  Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *
 * *  Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * *  Neither the name of Texas Instruments Incorporated nor the names of
 *    its contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 * OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
 
/*
 * gc global variable provides access to GUI Composer infrastructure components and project information.
 * For more information, please see the Working with Javascript guide in the online help.
 */
var gc = gc || {};
gc.services = gc.services || {};


var dataframe;
var in_process1 = false;
var testframes = [];
var onPlotsTab = false;
var defaultUpdateInProgress = false;
var tprocess1; // defined later
var trytimeout = 150; //msec
var tSummaryTab; // defined later
var visualizerVersion = '1.1.0.1';
var processedStream;
var streamWriter;
var savedStreamBytes = 0;
var savedStreamStart;
var dataFrameQueue = [];
var frame_cnt = 0;


var saveStreamStart = function(filename) {
    processedStream = streamSaver.createWriteStream(filename);
    streamWriter = processedStream.getWriter();
    savedStreamBytes = 0;
    frame_cnt = 0;
};
var saveStreamStop = function() {
    if (streamWriter) {
        streamWriter.close();
        streamWriter = null;
    }
};
var saveStreamAbort = function() {
    if (streamWriter){
        streamWriter.abort('reason');
        streamWriter = null;
    }
};
var saveStreamData = function(data) {
    if (streamWriter) 
    {
        // if (savedStreamBytes==0) 
        // {
        //     savedStreamStart = new Date().getTime();
        // }
        streamWriter.write(data);
        savedStreamBytes += data.length;
        // if ((savedStreamBytes >= (parseFloat(templateObj.$.ti_widget_textbox_record_file_size_limit.getText())*1024*1024)) ||
        //     (((new Date().getTime()) - savedStreamStart) > (parseInt(templateObj.$.ti_widget_textbox_record_time.getText())*1e3)))
        // {
        //     templateObj.$.ti_widget_button_record.label = 'Record Start';
        //     saveStreamStop();
        //     updateToast('Recording has been stopped as file/time max limit has reached');
        // }
    }
};

var extractDataFrame = function (dataframe_in) {
    // var dataframe_process = dataframe_in.slice(0,Params.total_payload_size_bytes);
    // if (initComplete === true && in_process1 === false && onPlotsTab == true && tprocess1) {
    //     dataFrameQueue.push(dataframe_process);
    // }
    // var dataframe_out=dataframe_in.slice(Params.total_payload_size_bytes,dataframe_in.length);
    
    return dataframe_out;
}


var onRecordPause = function() {
    
    var cmd = templateObj.$.ti_widget_button_record.label;
    var next;
    var platform='xwr16xx';
    
    if (cmd == 'Record Start') {
        next = 'Record Stop';
        var dateAppendStr = (new Date().toISOString().replace(/[-:\.]/g,"_").replace(/[Z]/g,""));
        if (Params) {
            if (Params.platform == mmwInput.Platform.xWR14xx) {
                platform='xwr14xx';
            } 
            saveStreamStart(platform + '_measureed_result_' + dateAppendStr + '.csv');
        } else {
            saveStreamStart('_measureed_result_' + dateAppendStr + '.csv');
        }
        var dateAppendStr = (new Date().toISOString().replace(/[-:\.]/g,"_").replace(/[Z]/g,""));
        const encoder = new TextEncoder
        let uint8array = encoder.encode('Frame,' + ' object at(m),' + "\n")
        saveStreamData(uint8array);
        ti_widget_label.label = 'Recording, please click \'Record Stop\' to stop record!';
        // var i;
        // var cars=new Array(256);
        // for (i = 0; i < 10; i++) { 
        //     cars[i] = '0'+i;
        // }
        
        // var str = '******************************\nmmWave Demo Visualizer\n******************************\n';
        
        // for (i = 0; i < 30; i++) { 
        //     cars[i] = "1";
        // }
        // cars[31] = '5';
        // const encoder = new TextEncoder
        // let data = 'a'.repeat(1024)
        // let uint8array = encoder.encode(str + "\n\n")
        
        // saveStreamData(uint8array);
        
    } else if (cmd == 'Record Stop') {
        next = 'Record Start';
        saveStreamStop();
        ti_widget_label.label = ' ';
    }
    
    templateObj.$.ti_widget_button_record.label = next;
    
};




/*
*  Boilerplate code for creating computed data bindings
*/
document.addEventListener('gc-databind-ready', function() {
	gc.databind.registry.getBinding('CFG_port.$rawData').addStreamingListener(cmd_sender_listener);
	
	gc.databind.registry.getBinding('DATA_port.$rawData').addStreamingListener({
	    onDataReceived: function(data) {
	        if (data) {
	            //console.log('  ... $rawData !! ' + (data ? data.length : 'nothing'));
	            if (Params) {
	                //TODO winnie needs to rewrite this piece.
    	            if (data.length >= 8+4+4 && isMagic(data, 0)) {
                        dataframe = data.slice(0);
                        Params.total_payload_size_bytes = totalFrameSize(data, 8+4);
	                } else if (dataframe) {
	                    if (dataframe.length < Params.total_payload_size_bytes) {
	                        Array.prototype.push.apply(dataframe, data);
	                    }
	                }
	                //if (dataframe.length === Params.total_payload_size_bytes && initComplete === true) {
	                if (dataframe && dataframe.length >= Params.total_payload_size_bytes && initComplete === true) {
                        if (in_process1 === false && onPlotsTab == true && tprocess1) {
	                        try {
	                            in_process1 = true;
    	                        tprocess1(dataframe);
	                        } finally {
    	                       in_process1 = false; // need to refactor, the global Params is not a good idea. we may hit exception when changing global Params and so in_process1 never flipped to false
    	                    }
	                    }
                    }
	            }
	        }
	    }
	});
	extendAboutBox();
});

/*
*  Boilerplate code for creating custom actions
*/
document.addEventListener('gc-nav-ready', function() {
    /* 
	*   Add custom actions for menu items using the following api:
	*
    *   function gc.nav.registryAction(id, runable, [isAvailable], [isVisible]);
	*
	*   param id - uniquely identifies the action, and should correspond to the action property of the menuaction widget.
	*   param runable - function that performs the custom action.
	*   param isAvailable - (optional) - function called when the menu action is about to appear.  Return false to disable the action, or true to enable it.
	*   param isVisible - (optional) - function called when the menu action is about to appear.  Return false to hide the action, or true to make it visible.
    */
	
	// For example,
	// gc.nav.registerAction('myCustomCloseAction', function() { window.close(); }, function() { return true; }, function() { return true; });
	
	// Alternatively, to programmatically disable a menu action at any time use:
	// gc.nav.disableAction('myCustomCloseAction);    then enable it again using:  gc.nav.enableAction('myCustomCloseAction'); 
	
});

/*
*  Boilerplate code for working with components in the application gist
*/


var initComplete = false;
var templateObj;

// Wait for DOMContentLoaded event before trying to access the application template
var init = function() {
    templateObj = document.querySelector('#template_obj');

    // Wait for the template to fire a dom-change event to indicate that it has been 'stamped'
    // before trying to access components in the application.
    if (templateObj) {
	templateObj.addEventListener('dom-change',function(){
	    if (initComplete) return;
	    this.async(function(){
    	    initComplete = true;
    	    console.log("Application template has been stamped.");
  	        // Now that the template has been stamped, you can use 'automatic node finding' $ syntax to access widgets.
  	        // e.g. to access a widget with an id of 'widget_id' you can use templateObj.$.widgetId
  	        var slow = checkBrowser();
  	        if (slow) trytimeout = 250; //msec
  	        tprocess1 = MyUtil.foo(trytimeout, process1);
  	        tSummaryTab = MyUtil.foo(1000, function(subset) {
  	            if (templateObj.$.ti_widget_droplist_summarytab.selectedValue == subset) {
                   onSummaryTab();
                }
            });
 	       // onResetProfile();
 	       // setupPlots(parseCfg(mmwInput.generateCfg().lines, res[1]));
 	       var default_lines = ["channelCfg 1 1 0","adcbufCfg 0 1 0 1","profileCfg 0 77 7 7 212.8 0 0  18.32 1 1024 5000 0 0 40","chirpCfg 0 0 0 0 0 0 0 1", "frameCfg 0 0 1 0 500 1 0", "guiMonitor 1   1 0  0 0  1"];
 	        setupPlots(parseCfg(default_lines, 'xWR14xx'));
 	        onSummaryTab();
 	  //      templateObj.$.ti_widget_button_start_stop.disabled = true;
  	   //     templateObj.$.ti_widget_slider_range_resolution._valueChanged = onRangeResolution;
  	  //      templateObj.$.ti_widget_slider_max_range._valueChanged = onMaxRange;
  	   //     templateObj.$.ti_widget_slider_max_radial_vel._valueChanged = onMaxRadialVel;
  	   //     templateObj.$.ti_widget_slider_frame_rate._valueChanged = onFrameRate;
 	        var query = window.location.search;
 	        if (query && query.length > 1) {
 	            if (query[0] == '?') query=query.slice(1);
 	            var tmp = query.split('&');
 	            for (var idx=0; idx<tmp.length; idx++) {
 	                if (tmp == 'debug=true') {
 	                    debug_mode = 1;
 	                }
 	            }
 	        }
 	        templateObj.$.ti_widget_tabcontainer_main.addEventListener('selected-index-changed', function(a,b,c) {
        	    onPlotsTab = templateObj.$.ti_widget_tabcontainer_main.selectedIndex == 0; 
	        });
	        onPlotsTab = templateObj.$.ti_widget_tabcontainer_main.selectedIndex == 0; // simply set onPlotsTab = true since single tab
	        conditionalAutoConnect();
	        //checkBrowser();
        },1);

	});
    }
};

templateObj = document.querySelector('#template_obj');
if (templateObj) {
    init();
} else {
    document.addEventListener('DOMContentLoaded',init.bind(this));
}

var extendAboutBox = function() {
    var aboutBox = document.querySelector('ti-widget-aboutbox');
    if (aboutBox){
        aboutBox.addEventListener('aboutbox_opening', function(event){
            aboutBox.appInfoTextHeading = 'Details';
            var str = '******************************\High Accuracy Visualizer\n******************************\n';
            str = str + 'Version                 : 1.0\n';
            str = str + 'Publish Date            : 10/21/2017\n';
            str = str + 'Compatible SDK Versions : mmWave SDK 1.0.0\n';
            str = str + '\n';
            str = str + 'Change List\n';
            str = str + '  04/26/2017: First version \n';
            str = str + '\n';
            str = str + '******************************\nConnected device\n******************************\n';
            aboutBox.appInfoText = str + 'Retreiving version information ...\nPlease connect hardware';
            aboutBox.numRowsInAppInfoTextArea = 16;
            cmd_sender_listener.askVersion(function(error, mesg) {
                if (mesg) aboutBox.appInfoText = str + mesg;
            });
        });
    }
};

var mmwInput = new mmWaveInput(); 

/*var onResetProfile = function() {
    // call this once to reset the min/max of sliders as per default. This causes values of sliders to set 
    // as per min/max of the sliders and not what we want the default to be
    setSubProfileDefaults(mmwInput.Input.subprofile_type);
    // call this again to now reset the values of the sliders
    setSubProfileDefaults(mmwInput.Input.subprofile_type);
}
var setSubProfileDefaults = function(subprofile_type) {
    if (subprofile_type == 'best_range_res') {
        mmwInput.setDefaultRangeResConfig(mmwInput.Input);
    } else if (subprofile_type == 'best_vel_res')  {
        mmwInput.setDefaultVelResConfig(mmwInput.Input);
    } else if (subprofile_type == 'best_range') {
        mmwInput.setDefaultRangeConfig(mmwInput.Input);
    } else {
        mmwInput.setDefaultRangeResConfig(mmwInput.Input);
    }
    // disable the continuous calling of updateInput while we adjust the sliders
    // to the values we desire
    defaultUpdateInProgress = true;
    setSliderDefaults();
    defaultUpdateInProgress = false;
    mmwInput.updateInput({});
    // call this again to set the values as per updateInput constraints
    setSliderDefaults();
};*/
var sendCmdAndSetupPlots = function(lines, platform) {
    templateObj.$.ti_widget_label_status_message.visible = false; 
    templateObj.$.ti_widget_label_status_message.label = "";
    templateObj.$.ti_widget_label_status_message.fontColor = "#ff0000";
    
    Params = parseCfg(lines, platform);
  //  checkFrameRateAndPlotSelection(Params);
    setupPlots(Params);
    var sendCmd = true;
    // change to scene params or respect user's previous choice?
    onSummaryTab(Params.guiMonitor.statsInfo == 1 ? 'Profiling' : 'Chirp/Frame');
    cmd_sender_listener.setCfg(lines, sendCmd, true, function(error) {
        if (error) {
            templateObj.$.ti_widget_label_status_message.fontColor = "#ff0000";
            templateObj.$.ti_widget_label_status_message.label = "Error: Incorrect config reported by target. Hint: Change configuration and try again";
            updateToast('Please see errors in the Console on Configure Tab. '+ templateObj.$.ti_widget_label_status_message.label)
            templateObj.$.ti_widget_label_status_message.visible = true;
            
        } else {
          //  templateObj.$.ti_widget_button_start_stop.disabled = false;
           // templateObj.$.ti_widget_button_start_stop.label = 'Stop';
            updatePlotInputGroup(true);
        }
    });
};
var isSerialPortPreset = function() {
    var prefix = location.pathname;
    if (prefix.substring(0,4) == '/gc/') {
        var tmp = location.pathname.lastIndexOf('/index.htm');
        var start = location.pathname.lastIndexOf('/', tmp >= 0 ? tmp-1 : undefined);
        prefix = location.pathname.substring(start+1, tmp);
    }
    var found = false;
    var ports = ['_CFG_port__comPort',  '_DATA_port__comPort'];
    if (localStorage) {
        found = true;
        for (var idx=0; idx < 2; idx++) {
            if (!localStorage[prefix + ports[idx]]) {
                found = false;
                break;
            }
        }
    }
    return found;
};
var promptSerialPort = function() {
    gc.nav.onClick('ConfigureSerialPort');
};
var checkSerialPort = function(verbose) {
    //templateObj.$.ti_widget_statusbar.statusString3 = "";
    // note: gc.connectionManager.status can be connected, disconnected, connecting and disconnecting. Not sure whether the last 2 is for public or for gc-internal only.
    // As of today, I can get data even though the status is connecting, though I expect at that point is connected.
    if (gc.connectionManager.status != 'disconnected') {
        // It would be nice if gc shows a better status message to say which port failed to open.
        var tmp = templateObj.$.ti_widget_statusbar.statusString1.split(',');
        if (tmp.length < 2) {
            // Here we are guessing what's going on
            // gives some warning but don't bother to prompt as the guess may not be correct
            //templateObj.$.ti_widget_statusbar.statusString3 = "Please ensure Serial Ports are set correctly";
            // 2nd param 5000: 5 secs timeout; last param 100: size of toast pop-up
            templateObj.$.ti_widget_statusbar.showToastMessage('Warning:', 5000, 'Please ensure Serial Ports are set correctly', null, 100); //MMWSDK-518
        }
        return true; // assume it is good enough
    } else {
        // 2nd param 5000: 5 secs timeout; last param 100: size of toast pop-up
        templateObj.$.ti_widget_statusbar.showToastMessage('Warning:', 5000, 'Please connect serial ports before configuring', null, 100); //MMWSDK-518
    }
    if (!isSerialPortPreset()) {
        templateObj.$.ti_widget_label_status_message.label = "Please setup Serial Ports and try again";
        templateObj.$.ti_widget_label_status_message.visible = true;
        templateObj.$.ti_widget_label_status_message.fontColor = "#ff0000";
    
        promptSerialPort();
        return false;
    }
    return true;
};
var conditionalAutoConnect = function() {
    if (gc.connectionManager.status == 'disconnected' && isSerialPortPreset()) {
        gc.connectionManager.connect().then(function() {
            // don't think it has a good callback to tell when the 'connect process' is done.
            // if (cb) cb()
        }); 
    } else {
        // will like to tell caller when it is done via callback
        // if (cb) cb()
    }
};
var onLoadCfg = function() {
    gc.File.browseAndLoad(null, null, function(data,fileInfo,err) {
        var lines = data.replace(/\r\n/g, '\n').split('\n');
        if (!checkSerialPort()) return;
        cmd_sender_listener.askVersion(function(error, mesg) {
            var res = mesg.match(/Platform\s*:\s*(\S*)/);
            sendCmdAndSetupPlots(lines, res && res.length > 1 ? res[1] : mmwInput.Input.platform);
        });
    }, myFileLoadDialog);
};
/*
var onStartStop = function() {
    var cmd = templateObj.$.ti_widget_button_start_stop.label;
    var next, disableInput;
    if (cmd == 'Stop') {
        cmd = 'sensorStop';
        next = 'Start';
        disableInput = false;
    } else if (cmd == 'Start') {
        cmd = 'sensorStart 0';
        next = 'Stop';
        disableInput = true;
        if (Params) setupPlots(Params);//Test whether this is ok
    }
    updatePlotInputGroup(disableInput);
    cmd_sender_listener.setCfg([cmd], true, false, function() {
        templateObj.$.ti_widget_button_start_stop.label = next;
    });
};*/
var checkBrowser = function() {
    var tmp = false;
    if (navigator.userAgent.indexOf('Firefox') >= 0) {
        tmp = true;
    }
    // chrome browser has chrome, safari. Safrai browser has chrome, safari.
    if (tmp) {
        updateToast('Please use Chrome browser for better performance', 100)
    }
    return tmp;
};
var updateToast = function(mesg, dur) {
    // updateToast() to hide the toast, updateToast('my mesg', 10) to show.
    // If user is on Plots tab and loadcfg has an error, it would be nice to use this toast to instruct the user.
    if (mesg && mesg.length > 0) {
        templateObj.$.ti_widget_toast_common.message = mesg;
        templateObj.$.ti_widget_toast_common.duration = dur || 15; // duraton (sec) to show message. The toast will then close if not yet. 0 means infinite.
        templateObj.$.ti_widget_toast_common.showToast();
    } else {
        templateObj.$.ti_widget_toast_common.hideToast();
    }
};
var NUM_ANGLE_BINS=64;
var Params;
var range_depth = 10;// Required. To be configured
var range_width = 5;// Required. To be configured
var maxRangeProfileYaxis = 2e6;// Optional. To be configured
var debug_mode = 0;
var COLOR_MAP=[[0, 'rgb(0,0,128)'], [1, 'rgb(0,255,255)']];

var dspFftScalCompDoppler = function (fftMinSize, fftSize)
{
    sLin = fftMinSize/fftSize;
    //sLog = 20*log10(sLin);
    return sLin;
}

var dspFftScalCompRange = function(fftMinSize, fftSize)
{
    smin =  (Math.pow((Math.ceil(Math.log2(fftMinSize)/Math.log2(4)-1)),2))/(fftMinSize);
    sLin =  (Math.pow((Math.ceil(Math.log2(fftSize)/Math.log2(4)-1)),2))/(fftSize);
    sLin = sLin / smin;
    //sLog = 20*log10(sLin);
    return sLin;
}

var parseCfg = function(lines, platform) {
    var P = {channelCfg: {}, dataPath:{}, profileCfg: {}, frameCfg: {}, guiMonitor: {}, platform: platform};

    for (var idx=0; idx<lines.length; idx++) {
        var tokens = lines[idx].split(/\s+/);
        if (tokens[0] == 'channelCfg') {
            P.channelCfg.txChannelEn = parseInt(tokens[2]);
            if (platform == mmwInput.Platform.xWR14xx) {
                P.dataPath.numTxAzimAnt = ((P.channelCfg.txChannelEn<<0)&1) +
                                          ((P.channelCfg.txChannelEn>>2)&1);
                P.dataPath.numTxElevAnt = ((P.channelCfg.txChannelEn>>1)&1);
            } else if (platform == mmwInput.Platform.xWR16xx) {
                P.dataPath.numTxAzimAnt = ((P.channelCfg.txChannelEn<<0)&1) +
                                              ((P.channelCfg.txChannelEn>>1)&1);
                P.dataPath.numTxElevAnt = 0;
            }
            P.channelCfg.rxChannelEn = parseInt(tokens[1]);
            P.dataPath.numRxAnt = ((P.channelCfg.rxChannelEn<<0)&1) +
                                  ((P.channelCfg.rxChannelEn>>1)&1) +
                                  ((P.channelCfg.rxChannelEn>>2)&1) +
                                  ((P.channelCfg.rxChannelEn>>3)&1);
            
        } else if (tokens[0] == 'profileCfg') {
            P.profileCfg.startFreq = parseInt(tokens[2]);
            P.profileCfg.idleTime =  parseInt(tokens[3]);
            P.profileCfg.rampEndTime = parseInt(tokens[5]);
            P.profileCfg.freqSlopeConst = parseInt(tokens[8]);
            P.profileCfg.numAdcSamples = parseInt(tokens[10]);
            P.profileCfg.digOutSampleRate = parseInt(tokens[11]); //%uints: ksps
        } else if (tokens[0] == 'chirpCfg') {
            //MMWSDK-507
            var txEnable = parseInt(tokens[8]);
            if (platform == mmwInput.Platform.xWR14xx) {
                if (txEnable == 5) {
                    P.dataPath.numTxAzimAnt = 1; //Non-MIMO - this overrides the channelCfg derived values
                }
            } else if (platform == mmwInput.Platform.xWR16xx) {
                if (txEnable == 3) {
                    P.dataPath.numTxAzimAnt = 1; //Non-MIMO  - this overrides the channelCfg derived values
                } 
            }
        } else if (tokens[0] == 'frameCfg') {
            P.frameCfg.chirpStartIdx = parseInt(tokens[1]);
            P.frameCfg.chirpEndIdx = parseInt(tokens[2]);
            P.frameCfg.numLoops = parseInt(tokens[3]);
            P.frameCfg.numFrames = parseInt(tokens[4]);
            P.frameCfg.framePeriodicity = parseInt(tokens[5]);
        } else if (tokens[0] == 'guiMonitor') {
            P.guiMonitor.detectedObjects = parseInt(tokens[1]);
            P.guiMonitor.logMagRange = parseInt(tokens[2]);
            P.guiMonitor.noiseProfile = parseInt(tokens[3]);
            P.guiMonitor.rangeAzimuthHeatMap = parseInt(tokens[4]);
            P.guiMonitor.rangeDopplerHeatMap = parseInt(tokens[5]);
            P.guiMonitor.statsInfo = parseInt(tokens[6]);
        }
    }
    P.dataPath.numTxAnt = P.dataPath.numTxElevAnt + P.dataPath.numTxAzimAnt;
    if ((P.dataPath.numRxAnt*P.dataPath.numTxAzimAnt<2))
    {
        P.dataPath.azimuthResolution = 'None';
    } else {
        P.dataPath.azimuthResolution = MyUtil.toPrecision(math.asin(2/(P.dataPath.numRxAnt*P.dataPath.numTxAzimAnt))*180/3.1415926,1);
    }
    P.dataPath.numChirpsPerFrame = (P.frameCfg.chirpEndIdx -
                                            P.frameCfg.chirpStartIdx + 1) *
                                            P.frameCfg.numLoops;
    P.dataPath.numDopplerBins = P.dataPath.numChirpsPerFrame / P.dataPath.numTxAnt;
    P.dataPath.numRangeBins = 1<<Math.ceil(Math.log2(P.profileCfg.numAdcSamples));
    P.dataPath.rangeResolutionMeters = 300 * P.profileCfg.digOutSampleRate /
                     (2 * P.profileCfg.freqSlopeConst * 1e3 * P.profileCfg.numAdcSamples);
    P.dataPath.rangeIdxToMeters = 300 * P.profileCfg.digOutSampleRate /
                     (2 * P.profileCfg.freqSlopeConst * 1e3 * P.dataPath.numRangeBins);
    P.dataPath.rangeMeters = 300 * 0.8 * P.profileCfg.digOutSampleRate /(2 * P.profileCfg.freqSlopeConst * 1e3);
    P.dataPath.velocityMps = 3e8 / (4*P.profileCfg.startFreq*1e9 *
                                        (P.profileCfg.idleTime + P.profileCfg.rampEndTime) *
                                        1e-6 * P.dataPath.numTxAnt); //use frameCfg params here
    P.dataPath.dopplerResolutionMps = 3e8 / (2*P.profileCfg.startFreq*1e9 *
                                        (P.profileCfg.idleTime + P.profileCfg.rampEndTime) *
                                        1e-6 * P.dataPath.numChirpsPerFrame); //use frameCfg params here

    if (platform == mmwInput.Platform.xWR14xx) {
        P.log2linScale = 1/512;
        if (P.dataPath.numTxElevAnt == 1) P.log2linScale = P.log2linScale*4/3; //MMWSDK-439
    } else if (platform == mmwInput.Platform.xWR16xx) {
        P.log2linScale = 1/(256*P.dataPath.numRxAnt*P.dataPath.numTxAnt);
    }
    
    P.toDB = 20 * Math.log10(2);
    P.rangeAzimuthHeatMapGrid_points = 100;
    P.stats = {activeFrameCPULoad: [], interFrameCPULoad: [], sizeLimit: 100};
    for (var i=0; i<P.stats.sizeLimit; i++) {
        P.stats.activeFrameCPULoad.push(0);
        P.stats.interFrameCPULoad.push(0);
    }
    
    /* compute scaling for doppler and range profile plots */
    P.dspFftScaleComp2D_lin = dspFftScalCompDoppler(16, P.dataPath.numDopplerBins);
    P.dspFftScaleComp2D_log = 20*Math.log10(P.dspFftScaleComp2D_lin);
    P.dspFftScaleComp1D_lin  = dspFftScalCompRange(64, P.dataPath.numRangeBins);
    P.dspFftScaleComp1D_log = 20*Math.log10(P.dspFftScaleComp1D_lin);
    
    //P.dspFftScaleCompAll_lin = P.dspFftScaleComp2D_lin * P.dspFftScaleComp1D_lin;
    //P.dspFftScaleCompAll_log = P.dspFftScaleComp2D_log + P.dspFftScaleComp1D_log;    
    P.dspFftScaleCompAll_lin = 1;
    P.dspFftScaleCompAll_log = 0;
    
    return P;
};

var byte_mult = [1, 256, Math.pow(2, 16), Math.pow(2,24)];

var isMagic = function(bytevec, byteVecIdx) {
    if (bytevec.length >= byteVecIdx+8) {
        return (
        bytevec[byteVecIdx+0] == 2 && bytevec[byteVecIdx+1] == 1 &&
        bytevec[byteVecIdx+2] == 4 && bytevec[byteVecIdx+3] == 3 &&
        bytevec[byteVecIdx+4] == 6 && bytevec[byteVecIdx+5] == 5 &&
        bytevec[byteVecIdx+6] == 8 && bytevec[byteVecIdx+7] == 7
        );
    }
    return false;
};

var totalFrameSize = function(bytevec, byteVecIdx) {
    var totalPacketLen = math.sum( math.dotMultiply( bytevec.slice(byteVecIdx, byteVecIdx+4), byte_mult ) );
    return totalPacketLen;
}

var searchMagic = function(bytevec, byteVecIdx) {
    var len = bytevec.length;
    var exp = [2, 1, 4, 3, 6, 5, 8, 7];
    var expidx=0;
    for (var idx=byteVecIdx; idx<len; idx++) {
        if (bytevec[idx] == exp[expidx] ) {
            if (expidx == exp.length-1) {
                var findIdx = idx-exp.length+1;
                return findIdx;
            } else {
                expidx++;
            }
        } else {
            expidx=0;
        }
    }
    return -1;
}

var TLV_type = {
    MMWDEMO_OUTPUT_MSG_DETECTED_POINTS : 1,
    MMWDEMO_OUTPUT_MSG_RANGE_PROFILE : 2,
    MMWDEMO_OUTPUT_MSG_NOISE_PROFILE : 3,
    MMWDEMO_OUTPUT_MSG_AZIMUT_STATIC_HEAT_MAP : 4,
    MMWDEMO_OUTPUT_MSG_RANGE_DOPPLER_HEAT_MAP : 5,
    MMWDEMO_OUTPUT_MSG_STATS : 6,
    MMWDEMO_OUTPUT_MSG_MAX : 7
};

// caution 0-based indexing; ending index not included unless otherwise specified
var process1 = function(bytevec) {
    // Header
    var byteVecIdx = 8; // magic word (4 unit16)
    // Version, uint32: MajorNum * 2^24 + MinorNum * 2^16 + BugfixNum * 2^8 + BuildNum
    Params.tlv_version = bytevec.slice(byteVecIdx, byteVecIdx+4);
    byteVecIdx += 4;
    
    // Total packet length including header in Bytes, uint32
    var totalPacketLen = math.sum( math.dotMultiply( bytevec.slice(byteVecIdx, byteVecIdx+4), byte_mult ) );
    byteVecIdx += 4;
    
    //platform type, uint32: 0xA1643 or 0xA1443 
    Params.tlv_platform = math.sum( math.dotMultiply( bytevec.slice(byteVecIdx, byteVecIdx+4), byte_mult ) );
    byteVecIdx += 4;
    
    // Frame number, uint32
    Params.frameNumber = math.sum( math.dotMultiply( bytevec.slice(byteVecIdx, byteVecIdx+4), byte_mult ) );
    byteVecIdx += 4;
    
    // Time in CPU cycles when the message was created. For AR16xx: DSP CPU cycles, for AR14xx: R4F CPU cycles, uint32
    var timeCpuCycles = math.sum( math.dotMultiply( bytevec.slice(byteVecIdx, byteVecIdx+4), byte_mult ) );
    byteVecIdx += 4;
    
    // Number of detected objects, uint32
    Params.numDetectedObj = math.sum( math.dotMultiply( bytevec.slice(byteVecIdx, byteVecIdx+4), byte_mult ) );
    byteVecIdx += 4;
    
    // Number of TLVs, uint32
    var numTLVs = math.sum( math.dotMultiply( bytevec.slice(byteVecIdx, byteVecIdx+4), byte_mult ) );
    byteVecIdx += 4;
    
    var detObjRes = {};
    
    // Start of TLVs
    for (var tlvidx=0; tlvidx<numTLVs; tlvidx++) {
        var tlvtype = math.sum( math.dotMultiply( bytevec.slice(byteVecIdx, byteVecIdx+4), byte_mult ) );
        byteVecIdx += 4;
        var tlvlength = math.sum( math.dotMultiply( bytevec.slice(byteVecIdx, byteVecIdx+4), byte_mult ) );
        byteVecIdx += 4;
        // tlv payload
        if (tlvtype == TLV_type.MMWDEMO_OUTPUT_MSG_DETECTED_POINTS) {
            // will not get this type if numDetectedObj == 0 even though gui monitor selects this type
            detObjRes = processDetectedPoints(bytevec, byteVecIdx, Params);
        } else if (tlvtype == TLV_type.MMWDEMO_OUTPUT_MSG_RANGE_PROFILE) {
            processRangeProfileHighAccu(bytevec, byteVecIdx, Params, tlvlength);//  replace  true, detObjRes);
        } else if (tlvtype == TLV_type.MMWDEMO_OUTPUT_MSG_NOISE_PROFILE) {
        //    processRangeProfileHighAccu(bytevec, byteVecIdx, Params, false);
        } else if (tlvtype == TLV_type.MMWDEMO_OUTPUT_MSG_AZIMUT_STATIC_HEAT_MAP) {
            processAzimuthHeatMap(bytevec, byteVecIdx, Params);
        } else if (tlvtype == TLV_type.MMWDEMO_OUTPUT_MSG_RANGE_DOPPLER_HEAT_MAP) {
            processRangeDopplerHeatMap(bytevec, byteVecIdx, Params);
        } else if (tlvtype == TLV_type.MMWDEMO_OUTPUT_MSG_STATS) {
            processStatistics(bytevec, byteVecIdx, Params);
        }
        byteVecIdx += tlvlength;
    }
    if (Params.numDetectedObj == 0)
        processDetectedPoints(undefined, undefined, Params);
};

var processDetectedPoints = function(bytevec, byteVecIdx, Params) {
    var elapsed_time = {}; // for profile this code only
    var rangeIdx, dopplerIdx, numDetectedObj = 0, xyzQFormat;

    if (Params.guiMonitor.detectedObjects == 1) {
        var start_time = new Date().getTime();
        if (bytevec) {
            // MmwDemo_output_message_dataObjDescr
            //  Number of detected objects, uint16
            numDetectedObj = math.sum( math.dotMultiply( bytevec.slice(byteVecIdx, byteVecIdx+2), [1, 256] ) );
            byteVecIdx += 2;
            //  Q format of detected objects x/y/z coordinates, uint16
            xyzQFormat = Math.pow(2,math.sum( math.dotMultiply( bytevec.slice(byteVecIdx, byteVecIdx+2),  [1, 256] ) ));
            byteVecIdx += 2;
        }
        // list of detected objects, each is
        //typedef volatile struct MmwDemo_detectedObj_t {
        //    uint16_t   rangeIdx;     Range index
        //    uint16_t   dopplerIdx;   Dopler index
        //    uint16_t  peakVal;       Peak value
        //    int16_t  x;              x - coordinate in meters. Q format depends on the range resolution
        //    int16_t  y;              y - coordinate in meters. Q format depends on the range resolution
        //    int16_t  z;              z - coordinate in meters. Q format depends on the range resolution
        //}
        var sizeofObj = 12; // size of MmwDemo_detectedObj_t in bytes
        if (numDetectedObj > 0) {
            var x = bytevec.slice(byteVecIdx, byteVecIdx+ sizeofObj*numDetectedObj);
            x = MyUtil.reshape(x, sizeofObj, numDetectedObj);
            // convert range index to range (in meters)
            rangeIdx = math.add(x[0], math.multiply(x[1], 256));
            var range = math.map(rangeIdx, function(value) {
               return value*Params.dataPath.rangeIdxToMeters; 
            });
            //circshift the doppler fft bins
            dopplerIdx = math.add(x[2], math.multiply(x[3], 256));
            math.forEach(dopplerIdx, function(value, idx, ary) {
                if (value > Params.dataPath.numDopplerBins/2-1) {
                    ary[idx] = ary[idx]-Params.dataPath.numDopplerBins;
                }
            });
            // convert doppler index to doppler (meters/sec)
            var doppler = math.map(dopplerIdx, function(value, idx, ary) {
                return value*Params.dataPath.dopplerResolutionMps;
            });
            // peak value
            var peakVal = math.add(x[4], math.multiply(x[5], 256));
            var peakValLog = math.map(peakVal, function(value) {
                return Math.round(10*math.log10(1+value));
            });
            // x_coord, y_coord, z_coord
            var x_coord = math.add(x[6], math.multiply(x[7], 256));
            var y_coord = math.add(x[8], math.multiply(x[9], 256));
            var z_coord = math.add(x[10], math.multiply(x[11], 256));
             var xyz = [x_coord, y_coord, z_coord];
            for (var xyzidx=0; xyzidx<xyz.length; xyzidx++) {
                math.forEach(xyz[xyzidx], function(value, idx, ary) {
                    if (value > 32767) { value = value - 65536; }
                    ary[idx] = math.add(rangeIdx, math.multiply(value, 65536))/xyzQFormat;
                });
            }
            if (Params.dataPath.numTxElevAnt == 1) {
                if (Params.use_restyle==1) {
                var update = {
                    x:[x_coord], y:[y_coord], z: [z_coord]
                };
                templateObj.$.ti_widget_plot1.restyle(update, [0]);
                } else if (Params.use_restyle==2) {
                templateObj.$.ti_widget_plot1.data[0].x = x_coord;
                templateObj.$.ti_widget_plot1.data[0].y = y_coord;
                templateObj.$.ti_widget_plot1.data[0].z = z_coord;
                templateObj.$.ti_widget_plot1.redraw();
                }
            } else {
                if (Params.use_restyle==1) {
                var update = {
                    x:[x_coord], y:[y_coord], 'marker.color': [peakValLog]
                };
                templateObj.$.ti_widget_plot1.restyle(update, [0]);
                } else if (Params.use_restyle==2) {
                templateObj.$.ti_widget_plot1.data[0].x = math.zeros(x_coord.length).valueOf();// [WL: 0;
                templateObj.$.ti_widget_plot1.data[0].y = x_coord;
                //templateObj.$.ti_widget_plot1.data[0].marker.color = peakValLog;
                //templateObj.$.ti_widget_plot1.data[0].marker.color = '#00FF00'; //#1BC81B';
                var title_s = 'X-Y Scatter Plot' + '<br />' + 'object at ' + math.round(x_coord*10000)/10000 + '' + ' meters';
                //---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------//
                //saveStreamData('Skipped');
                //.toISOString().replace(/[-:\.]/g,"_").replace(/[Z]/g,"")
                //new Date().getTime().toISOString()
                var dateAppendStr = (new Date().toISOString().replace(/[-:\.]/g,"_").replace(/[Z]/g,""));
                const encoder = new TextEncoder
                //let uint8array = encoder.encode('Frame = ' + frame_cnt + '; object at ' + math.round(x_coord*10000)/10000 + '' + ' meters' + "\n")
                let uint8array = encoder.encode(frame_cnt + ', ' + math.round(x_coord*10000)/10000 + ',' + "\n")
        
                frame_cnt++;
                saveStreamData(uint8array);
                
                templateObj.$.ti_widget_plot1.layout.title = title_s;
                templateObj.$.ti_widget_plot1.redraw();
                }
            }
            elapsed_time.scatterPlot = new Date().getTime() - start_time;
     /*       if (Params.guiMonitor.rangeDopplerHeatMap != 1) {
                start_time = new Date().getTime();
                //%Plot detected objects in Range/Dopler space
                if (Params.use_restyle==1) {
                var update = {
                    x:[range], y:[doppler], 'marker.color': [peakValLog]
                };
                templateObj.$.ti_widget_plot3.restyle(update, [0]);
                } else if (Params.use_restyle==2) {
                templateObj.$.ti_widget_plot3.data[0].x = range;
                templateObj.$.ti_widget_plot3.data[0].y = doppler;
                //templateObj.$.ti_widget_plot3.data[0].marker.color = peakValLog;
                //templateObj.$.ti_widget_plot3.data[0].marker.color = '#00FF00'; //#1BC81B';
                templateObj.$.ti_widget_plot3.redraw();
                }
                elapsed_time.rangeDopplerPlot = new Date().getTime() - start_time;
            }*/
        } else {
            // empty plot
            if (Params.use_restyle==1) {
            var update = {x:[[]], y:[[]]};
            if (Params.dataPath.numTxElevAnt == 1)
                update.z=[[]];
            templateObj.$.ti_widget_plot1.restyle(update, [0]);
        //    templateObj.$.ti_widget_plot3.restyle({x:[[]], y:[[]]}, [0]);
            } else if (Params.use_restyle==2) {
            templateObj.$.ti_widget_plot1.data[0].x = [];
            templateObj.$.ti_widget_plot1.data[0].y = [];
            if (Params.dataPath.numTxElevAnt == 1) {
                templateObj.$.ti_widget_plot1.data[0].z = [];
            }
            templateObj.$.ti_widget_plot1.redraw();

       //     templateObj.$.ti_widget_plot3.data[0].x = [];
       //     templateObj.$.ti_widget_plot3.data[0].y = [];
       //     templateObj.$.ti_widget_plot3.redraw();
            }
        }
    } // end if (Params.guiMonitor.detectedObjects == 1)
    return {rangeIdx: rangeIdx, dopplerIdx: dopplerIdx, numDetectedObj: numDetectedObj}
};
/*
var processRangeNoiseProfile = function(bytevec, byteVecIdx, Params, isRangeProfile, detObjRes) {
    var elapsed_time = {}; // for profile this code only
    if (isRangeProfile && Params.guiMonitor.logMagRange != 1) return;
    if (isRangeProfile == false && Params.guiMonitor.noiseProfile != 1) return;
    var traceIdx = isRangeProfile ? 0 : 2;
    
    //if (Params.guiMonitor.logMagRange == 1) {
        var start_time = new Date().getTime();
        // %bytes corresponding to range profile are in rp
        var rp = bytevec.slice(byteVecIdx, byteVecIdx+Params.dataPath.numRangeBins*2);
        if (Params.platform == mmwInput.Platform.xWR16xx) {
            rp = math.add(
            math.subset(rp, math.index(math.range(0,Params.dataPath.numRangeBins*2,2))), 
            math.multiply(math.subset(rp, math.index(math.range(1,Params.dataPath.numRangeBins*2,2))), 256)
            );
			rp = math.add(
            math.subset(rp, math.index(math.range(0,Params.dataPath.numRangeBins*2,2))), 
            math.multiply(math.subset(rp, math.index(math.range(1,Params.dataPath.numRangeBins*2,2))), 65536)
            );
        } else if (Params.platform == mmwInput.Platform.xWR16xx) {
            title = 'Active and Interframe  CPU (C674x) Load';
        }
		
		rp = math.add(
            math.subset(rp, math.index(math.range(0,Params.dataPath.numRangeBins*2,2))), 
            math.multiply(math.subset(rp, math.index(math.range(1,Params.dataPath.numRangeBins*2,2))), 256)
        );
        if (Params.rangeProfileLogScale == false) {
            math.forEach(rp, function(value, idx, ary) {
                ary[idx] = Params.dspFftScaleCompAll_lin * Math.pow(2,value*Params.log2linScale);
            });
        } else {
            math.forEach(rp, function(value, idx, ary) {
                ary[idx] = value*Params.log2linScale*Params.toDB  + Params.dspFftScaleCompAll_log;
            });
        }
        var rp_x = math.multiply(math.range(0,Params.dataPath.numRangeBins), Params.dataPath.rangeIdxToMeters).valueOf();
        var update = {x:[],y:[]};
        if (Params.use_restyle==1) {
            update.x.push(rp_x);
            update.y.push(rp.valueOf());
        } else if (Params.use_restyle==2) {
        templateObj.$.ti_widget_plot2.data[traceIdx].x = rp_x;
        templateObj.$.ti_widget_plot2.data[traceIdx].y = rp.valueOf();
        } else {
            rp.valueOf();
        }
        if (isRangeProfile == true && detObjRes) {
            if (detObjRes.rangeIdx) {
                var rp_det = []; //math.zeros(math.size(rp)).valueOf();
                var rp_det_x = [];
                math.forEach(detObjRes.rangeIdx, function(value, idx) {
                    // caution the content of x(1,:) is range index, is this indexing 1-based or 0-based in target code?
                    if (detObjRes.dopplerIdx[idx] == 0) {
                        //rp_det[value] = rp[value];
                        rp_det.push(rp[value]);
                        rp_det_x.push(rp_x[value]);
                    }
                });
                if (Params.use_restyle==1) {
                    update.x.push(rp_x);
                    update.y.push(rp_det);
                } else if (Params.use_restyle==2) {
                templateObj.$.ti_widget_plot2.data[1].x = rp_det_x;
                templateObj.$.ti_widget_plot2.data[1].y = rp_det;
                }
            } else {
                if (Params.use_restyle==1) {
                    update.x.push([]);
                    update.y.push([]);
                } else if (Params.use_restyle==2) {
                templateObj.$.ti_widget_plot2.data[1].x = [];
                templateObj.$.ti_widget_plot2.data[1].y = [];
                }
            }
        }
        if (Params.use_restyle==1) {
            templateObj.$.ti_widget_plot2.restyle(update, [0,1]);
        } else if (Params.use_restyle==2) {
        templateObj.$.ti_widget_plot2.redraw();
        }
        elapsed_time.logMagRange = new Date().getTime() - start_time;
    //}
};
*/
var bytesToFloat = function(a,b,c,d) {
//var bytes = [ 0x40, 0x33, 0xc3, 0x85 ];
//var bits = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | (bytes[3]);
    var bits = (a << 24) | (b << 16) | (c << 8) | (d);
    var sign = ((bits >>> 31) == 0) ? 1.0 : -1.0;
    var e = ((bits >>> 23) & 0xff);
    var m = (e == 0) ? (bits & 0x7fffff) << 1 : (bits & 0x7fffff) | 0x800000;
    return sign * m * Math.pow(2, e - 150);
}


var processRangeProfileHighAccu = function(bytevec, byteVecIdx, Params, tlvlen) {
    var rp = [];
    if (Params.platform == mmwInput.Platform.xWR16xx)  {
        // equiv. to check if Params.tlv_platform is 0xa1642
        var real=[], imag=[];
        for (var idx=0; idx+7<tlvlen; idx+=4) {
            var tmp = bytesToFloat(bytevec[byteVecIdx + idx+3], bytevec[byteVecIdx + idx+2], bytevec[byteVecIdx + idx+1], bytevec[byteVecIdx + idx]);
            imag.push(tmp);
            
            idx+=4;
            tmp = bytesToFloat(bytevec[byteVecIdx + idx+3], bytevec[byteVecIdx + idx+2], bytevec[byteVecIdx + idx+1], bytevec[byteVecIdx + idx]);
            real.push(tmp);
        }
        // if length of real and imag is not a power of 2, do you want to pad zeros to it to make it a power of 2?
        fft.transform(real, imag);
        for (var ri=0; ri<real.length; ri++) {
            rp.push( Math.sqrt(real[ri]*real[ri] + imag[ri]*imag[ri]) ); // abs()
        }
    } else {
        for (var idx=0; idx+1<tlvlen; idx+=2) {
            var tmp = bytevec[byteVecIdx + idx] + bytevec[byteVecIdx + idx+1]*256;
            if (tmp > 32767) tmp -= 65536;
            rp.push(tmp);
        }
    }
    // numPoint = round(range_depth/Params.dataPath.rangeResolutionMeters);
    // plot((0:numPoint-1)*Params.dataPath.rangeResolutionMeters, rp(1:numPoint));
    var numPoint = Math.round(range_depth/Params.dataPath.rangeResolutionMeters);
    if (numPoint > rp.length) numPoint=rp.length;
    var x =[];
    for (var idx=0; idx<numPoint; idx++) { x.push(idx*Params.dataPath.rangeResolutionMeters); }
    templateObj.$.ti_widget_plot2.data[0].x = x;
    templateObj.$.ti_widget_plot2.data[0].y = rp.slice(0, numPoint);
    templateObj.$.ti_widget_plot2.redraw();
    
};
var processStatistics = function(bytevec, byteVecIdx, Params) {
    if (Params.guiMonitor.statsInfo == 1) {
        Params.interFrameProcessingTime = math.sum( math.dotMultiply( bytevec.slice(byteVecIdx, byteVecIdx+4), byte_mult ) );
        byteVecIdx += 4;
    
        Params.transmitOutputTime = math.sum( math.dotMultiply( bytevec.slice(byteVecIdx, byteVecIdx+4), byte_mult ) );
        byteVecIdx += 4;
    
        Params.interFrameProcessingMargin = math.sum( math.dotMultiply( bytevec.slice(byteVecIdx, byteVecIdx+4), byte_mult ) );
        byteVecIdx += 4;
    
        Params.interChirpProcessingMargin = math.sum( math.dotMultiply( bytevec.slice(byteVecIdx, byteVecIdx+4), byte_mult ) );
        byteVecIdx += 4;
    
        Params.activeFrameCPULoad = math.sum( math.dotMultiply( bytevec.slice(byteVecIdx, byteVecIdx+4), byte_mult ) );
        byteVecIdx += 4;
    
        Params.interFrameCPULoad = math.sum( math.dotMultiply( bytevec.slice(byteVecIdx, byteVecIdx+4), byte_mult ) );
        byteVecIdx += 4;
        
        Params.stats.activeFrameCPULoad.shift(); Params.stats.activeFrameCPULoad.push(Params.activeFrameCPULoad);
        Params.stats.interFrameCPULoad.shift(); Params.stats.interFrameCPULoad.push(Params.interFrameCPULoad);
        tSummaryTab('Profiling');

        templateObj.$.ti_widget_plot5.data[0].y = Params.stats.activeFrameCPULoad;
        templateObj.$.ti_widget_plot5.data[1].y = Params.stats.interFrameCPULoad;
        templateObj.$.ti_widget_plot5.redraw();
    }
};

var positionPlot = function(plot, display, posIdx) {
    var left = [0, 500, 0, 500, 1000];
    var top = [0, 0, 500, 500, 500];
    // layout.margin = {t:100,b:80,l:80,r:80}
    var width = 480; // initial setting in index.gui file
    var height = 480-160+180;
    plot.layout.autoresize = false;
    plot.layout.height = height;
    plot.layout.width = width;
    if (display) {
        plot.style.display = 'block';
        plot.style.left = left[posIdx]+'px';
        plot.style.top = top[posIdx]+'px';
    } else {
        plot.style.display = 'none';
    }
};

var setupPlots = function(Params) {
    //range_depth
    var tmp = parseFloat(templateObj.$.ti_widget_textbox_depth.getText());
    if (tmp != NaN) { range_depth = Math.abs(tmp); }
    if (range_depth>(Params.dataPath.rangeIdxToMeters * Params.dataPath.numRangeBins)) {
        range_depth = MyUtil.toPrecision(Params.dataPath.rangeIdxToMeters * Params.dataPath.numRangeBins,2);
        reflectTextbox(templateObj.$.ti_widget_textbox_depth,range_depth);
    }
    // range_width
    tmp = parseFloat(templateObj.$.ti_widget_textbox_width.getText());
    if (tmp != NaN) { range_width = Math.abs(tmp); }
    if (range_width>(Params.dataPath.rangeIdxToMeters * Params.dataPath.numRangeBins/2)) {
        range_width = MyUtil.toPrecision((Params.dataPath.rangeIdxToMeters * Params.dataPath.numRangeBins)/2,2);
        reflectTextbox(templateObj.$.ti_widget_textbox_width,range_width);
    }
    tmp = parseFloat(templateObj.$.ti_widget_textbox_rpymax.getText());
    if (tmp != NaN) { maxRangeProfileYaxis = Math.abs(tmp); }
    Params.rangeProfileLogScale = templateObj.$.ti_widget_checkbox_rplogscale.checked;
    Params.use_restyle = 2;
    var plotPosIdx=0;
    templateObj.$.ti_widget_image_cb.visible = false;
    templateObj.$.ti_widget_label_cbmin.visible  = false;
    templateObj.$.ti_widget_label_cbmax.visible  = false;
    if (Params.guiMonitor.detectedObjects == 1) {
        if (Params.dataPath.numTxElevAnt == 1) {
            templateObj.$.ti_widget_plot1.data = [
                {type: 'scatter3d', mode: 'markers',
                 marker: {size: 3}
                }
            ];
            templateObj.$.ti_widget_plot1.layout.title = '3D Scatter Plot';
            templateObj.$.ti_widget_plot1.layout.margin={t: 100, b: 10, l: 10, r: 10};
            delete templateObj.$.ti_widget_plot1.layout.plot_bgcolor;
            delete templateObj.$.ti_widget_plot1.layout.xaxis;
            delete templateObj.$.ti_widget_plot1.layout.yaxis;
            templateObj.$.ti_widget_plot1.layout.scene = {
                xaxis: {title: 'meters',
                        nticks: 5,
                        range: [-range_width, range_width]},
                yaxis: {title: 'meters',
                        nticks: 5,
                        range: [0, range_depth]},
                zaxis: {//title: 'range',
                        nticks: 3,
                        range: [-1.2, 1]},
                camera: {
                    center:{x:0, y:0, z:-0.3},
                    eye:{x:1.5, y:1.5, z:0.1},
                    up:{x:0, y:0, z:1}
                }
            };
        } else {
            var gridchoice = 'polar grid 2';
            var rectgrid = gridchoice == 'rect grid';
            templateObj.$.ti_widget_plot1.data = [
                {type: 'scatter', mode: 'markers',
                 marker: {size:4, color: 'rgb(0,255,0)', showscale:false}
                }
            ];
            templateObj.$.ti_widget_plot1.layout.title = 'X-Y Scatter Plot';
            delete templateObj.$.ti_widget_plot1.layout.margin;
            templateObj.$.ti_widget_plot1.layout.plot_bgcolor = 'rgb(0,0,96)';
            templateObj.$.ti_widget_plot1.layout.xaxis = {
                title: 'Distance along lateral axis (meters)',
                showgrid: rectgrid,
                //zerolinecolor: 'rgb(128,128,128)',
                autorange: false,
                range: [-range_width, range_width]
            };
            templateObj.$.ti_widget_plot1.layout.yaxis = {
                title: 'Distance along longitudinal axis (meters)',
                showgrid: rectgrid,
                autorange: false,
                range: [0, range_depth]
            };
            var radii = [];
            var angles = [];
            if (gridchoice == 'polar grid 1') {
                radii.push(range_depth);
                angles.push( math.pi/6 + 0*math.pi*2/12 );
                angles.push( math.pi/6 + 4*math.pi*2/12 );
            } else if (gridchoice == 'polar grid 2') {
                for (var i=1; i<=4; i++) {
                    radii.push(i*range_depth/4);
                }
                for (var i=0; i<5; i++, idx+=1) {
                    //if (i==2) continue; // skip the main vertical line
                    angles.push( math.pi/6 + i*math.pi*2/12 );
                }
            }
            var points = 16;
            var w = math.range(math.pi/6,5*math.pi/6, (4*math.pi/6)/(points), true).valueOf();
            if (w.length < points) w.push(5*math.pi/6);
            var idx=1;
            //for (var r=0.5; r <= range_depth; r += 0.5, idx+=1) {
            for (var i=0; i<radii.length; i++, idx+=1) {
                var r = radii[i]
                var x = math.map(w, function(value) {return r*math.cos(value)});
                var y = math.map(w, function(value) {return r*math.sin(value)});
                var arc = {type: 'scatter', mode: 'lines', line: {color: 'rgb(128,128,128)', width:1},
                    showlegend: false, hoverinfo: 'none',
                    x: x, y: y };
                templateObj.$.ti_widget_plot1.data.push(arc);
            }
            for (var i=0; i<angles.length; i++, idx+=1) {
                var angle = angles[i];
                var line = {type: 'scatter', mode: 'lines', line: {color: 'rgb(128,128,128)', width:1},
                    showlegend: false, hoverinfo: 'none',
                    x: [0, range_depth*math.cos(angle)], y: [0, range_depth*math.sin(angle)] };
                templateObj.$.ti_widget_plot1.data.push(line);
            }
        }
        templateObj.$.ti_widget_plot1.layout.showlegend=false;
        positionPlot(templateObj.$.ti_widget_plot1, true, plotPosIdx++);
        templateObj.$.ti_widget_plot1.redraw();
    } else {
        positionPlot(templateObj.$.ti_widget_plot1, false);
    }
    if (Params.guiMonitor.logMagRange == 1 || Params.guiMonitor.noiseProfile == 1) {
        templateObj.$.ti_widget_plot2.data = [
            {type: 'scatter', mode: 'lines'} // data[0] range profile
      //      ,{type: 'scatter', mode: 'markers'} // data[1] range profile at detected objs
       //     ,{type: 'scatter', mode: 'lines'} // data[2] noise profile
        ];
        templateObj.$.ti_widget_plot2.layout.title = 'Range Profile';
        templateObj.$.ti_widget_plot2.layout.xaxis = {
            title: 'Range (meters)',
            autorange: false,
            range: [0, Params.dataPath.rangeIdxToMeters * Params.dataPath.numRangeBins]
        };
        var ymax = maxRangeProfileYaxis;
        if (Params.rangeProfileLogScale == true) {
            ymax = Math.log2(maxRangeProfileYaxis)*Params.toDB;
        }
        templateObj.$.ti_widget_plot2.layout.yaxis = {
            autorange: false,
            range: [0, ymax]
        };
        templateObj.$.ti_widget_plot2.layout.showlegend=false;
        positionPlot(templateObj.$.ti_widget_plot2, true, plotPosIdx++);
        templateObj.$.ti_widget_plot2.redraw();
    } else {
        positionPlot(templateObj.$.ti_widget_plot2, false);
    }
  /*  if (Params.guiMonitor.rangeDopplerHeatMap == 1) {
        templateObj.$.ti_widget_image_cb.visible = true;
        templateObj.$.ti_widget_label_cbmin.visible = true;
        templateObj.$.ti_widget_label_cbmax.visible = true;
    
        templateObj.$.ti_widget_plot3.data = [
            {type: 'heatmap',
             zauto: true,
             zsmooth: 'fast',
             colorscale: COLOR_MAP,
             showscale: false
            }
        ];
        var dopplerRange = Params.dataPath.dopplerResolutionMps * (Params.dataPath.numDopplerBins/2-1);
        templateObj.$.ti_widget_plot3.layout.title = 'Doppler-Range Heatmap';
        delete templateObj.$.ti_widget_plot3.layout.plot_bgcolor;
        templateObj.$.ti_widget_plot3.layout.xaxis = {
            title: 'Range (meters)',
            autorange: false,
            range: [0, range_depth]
        };
        templateObj.$.ti_widget_plot3.layout.yaxis = {
            title: 'Doppler (m/s)',
            autorange: false,
            range: [-dopplerRange, dopplerRange]
        };
        positionPlot(templateObj.$.ti_widget_plot3, true, plotPosIdx++);
        templateObj.$.ti_widget_plot3.redraw();
    } else if (Params.guiMonitor.detectedObjects == 1  && Params.guiMonitor.rangeDopplerHeatMap == 0) {
        templateObj.$.ti_widget_plot3.data = [
            {type: 'scatter', mode: 'markers',
             marker: {size:4, color: 'rgb(0,255,0)', showscale:false}
            }
        ];
        var dopplerRange = Params.dataPath.dopplerResolutionMps * Params.dataPath.numDopplerBins / 2;
        templateObj.$.ti_widget_plot3.layout.title = 'Doppler-Range Plot';
        templateObj.$.ti_widget_plot3.layout.plot_bgcolor = 'rgb(0,0,96)'
        templateObj.$.ti_widget_plot3.layout.xaxis = {
            title: 'Range (meters)',
            gridcolor: 'rgb(68,68,68)',
            autorange: false,
            range: [0, range_depth]
        };
        templateObj.$.ti_widget_plot3.layout.yaxis = {
            title: 'Doppler (m/s)',
            gridcolor: 'rgb(68,68,68)',
            zerolinecolor: 'rgb(128,128,128)',
            autorange: false,
            range: [-dopplerRange, dopplerRange]
        };
        positionPlot(templateObj.$.ti_widget_plot3, true, plotPosIdx++);
        templateObj.$.ti_widget_plot3.redraw();
    } else {
        positionPlot(templateObj.$.ti_widget_plot3, false);
    }
    if (Params.guiMonitor.rangeAzimuthHeatMap == 1) {
        templateObj.$.ti_widget_image_cb.visible = true;
        templateObj.$.ti_widget_label_cbmin.visible = true;
        templateObj.$.ti_widget_label_cbmax.visible = true;
        templateObj.$.ti_widget_plot4.data = [
            {type: 'heatmap',
             zauto: true,
             zsmooth: false, //'best','fast',false;
             connectgaps: true,
             colorscale: COLOR_MAP,
             showscale: false
            }
        ];
        templateObj.$.ti_widget_plot4.layout.title = 'Azimuth-Range Heatmap';
        templateObj.$.ti_widget_plot4.layout.xaxis = {
            title: 'Distance along lateral axis (meters)',
            autorange: false,
            range: [-range_width, range_width]
        };
        templateObj.$.ti_widget_plot4.layout.yaxis = {
            title: 'Distance along longitudinal axis (meters)',
            autorange: false,
            range: [0, range_depth]
        };
        //templateObj.$.ti_widget_plot4.layout.autoresize=false;
        //templateObj.$.ti_widget_plot4.layout.height = height;
        //templateObj.$.ti_widget_plot4.layout.width = width;
        if (2*range_width > range_depth) {
            var tmp = range_depth / (2*range_width);
            templateObj.$.ti_widget_plot4.layout.yaxis.domain = [0.5-tmp/2, 0.5+tmp/2.0];
        } else if (2*range_width < range_depth) {
            var tmp = (2*range_width)/ range_depth ;
            templateObj.$.ti_widget_plot4.layout.xaxis.domain = [0.5-tmp/2, 0.5+tmp/2.0];
        }
        positionPlot(templateObj.$.ti_widget_plot4, true, plotPosIdx++);
        templateObj.$.ti_widget_plot4.redraw();
    } else {
        positionPlot(templateObj.$.ti_widget_plot4, false);
    }*/
    if (Params.guiMonitor.statsInfo == 1) {
        templateObj.$.ti_widget_plot5.data = [
            {type: 'scatter', mode: 'lines', name:'Active frame'} // data[0] activeFrameCPULoad
            ,{type: 'scatter', mode: 'lines', name: 'Interframe'} // data[1] interFrameCPULoad
        ];
        var title = 'CPU Load';
        if (Params.platform == mmwInput.Platform.xWR14xx) {
            title = 'Active and Interframe CPU (R4F) load';
        } else if (Params.platform == mmwInput.Platform.xWR16xx) {
            title = 'Active and Interframe  CPU (C674x) Load';
        }
        templateObj.$.ti_widget_plot5.layout.title = title;
        templateObj.$.ti_widget_plot5.layout.xaxis = {
            title: 'Frames',
            autorange: false,
            range: [0, 100]
        };
        templateObj.$.ti_widget_plot5.layout.yaxis = {
            title: '% CPU Load',
            autorange: false,
            range: [0, 100]
        };
        //templateObj.$.ti_widget_plot5.layout.showlegend=false;
        positionPlot(templateObj.$.ti_widget_plot5, true, plotPosIdx++);
        templateObj.$.ti_widget_plot5.redraw();
    } else {
        positionPlot(templateObj.$.ti_widget_plot5, false);
    }
};
var updatePlotInputGroup = function(disable) {
    templateObj.$.ti_widget_textbox_depth.disabled = disable;
    templateObj.$.ti_widget_textbox_width.disabled = disable;
    templateObj.$.ti_widget_textbox_rpymax.disabled = disable;
    templateObj.$.ti_widget_checkbox_rplogscale.disabled = disable;
}
var onRangeProfileLogScale = function() {
    //console.log(templateObj.$.ti_widget_checkbox_rplogscale.checked);
};
var onSummaryTab = function(subset) {
    if (subset) templateObj.$.ti_widget_droplist_summarytab.selectedValue = subset;
    else subset = templateObj.$.ti_widget_droplist_summarytab.selectedValue;
    var showitem = 0;
    if (Params) {
      if (subset == 'Chirp/Frame') {
        templateObj.$.ti_widget_label1.label = 'Start Frequency (Ghz)';
        templateObj.$.ti_widget_value1.label = MyUtil.sprintf(Params.profileCfg.startFreq, 4);
        templateObj.$.ti_widget_label2.label = 'Slope (MHz/us)';
        templateObj.$.ti_widget_value2.label = MyUtil.sprintf(Params.profileCfg.freqSlopeConst, 4);
        templateObj.$.ti_widget_label3.label = 'Samples per chirp';
        templateObj.$.ti_widget_value3.label = MyUtil.sprintf(Params.profileCfg.numAdcSamples, 4);
        templateObj.$.ti_widget_label4.label = 'Chirps per frame';
        templateObj.$.ti_widget_value4.label = MyUtil.sprintf(Params.dataPath.numChirpsPerFrame, 4);
        templateObj.$.ti_widget_label5.label = 'Sampling rate (Msps)';
        templateObj.$.ti_widget_value5.label = MyUtil.sprintf(Params.profileCfg.digOutSampleRate / 1000, 4);
        templateObj.$.ti_widget_label6.label = 'Sweep Bandwidth (GHz)';
        templateObj.$.ti_widget_value6.label = MyUtil.sprintf(Params.profileCfg.freqSlopeConst * Params.profileCfg.numAdcSamples /Params.profileCfg.digOutSampleRate, 4);
        templateObj.$.ti_widget_label7.label = 'Frame periodicity (msec)';
        templateObj.$.ti_widget_value7.label = MyUtil.sprintf(Params.frameCfg.framePeriodicity, 4);
        templateObj.$.ti_widget_label8.label = 'Transmit Antennas';
        templateObj.$.ti_widget_value8.label = MyUtil.sprintf(Params.dataPath.numTxAnt, 4);//Number of Tx (MIMO)
        templateObj.$.ti_widget_label9.label = 'Receive Antennas';
        templateObj.$.ti_widget_value9.label = MyUtil.sprintf(Params.dataPath.numRxAnt, 4);//Number of Tx (MIMO)
        showitem = 9;
      } else if (subset == 'Scene') {
        templateObj.$.ti_widget_label1.label = 'Range resolution (m)';
        templateObj.$.ti_widget_value1.label = MyUtil.sprintf(Params.dataPath.rangeResolutionMeters, 4);
        templateObj.$.ti_widget_label2.label = 'Max Unambiguous Range (m)';
        templateObj.$.ti_widget_value2.label = MyUtil.sprintf(Params.dataPath.rangeMeters, 4);
       /* templateObj.$.ti_widget_label3.label = 'Max Radial Velocity (m/s)';
        templateObj.$.ti_widget_value3.label = MyUtil.sprintf(Params.dataPath.velocityMps, 4);;
        templateObj.$.ti_widget_label4.label = 'Radial Velocity Resolution (m/s)';
        templateObj.$.ti_widget_value4.label = MyUtil.sprintf(Params.dataPath.dopplerResolutionMps, 4);
        templateObj.$.ti_widget_label5.label = 'Azimuth Resolution (Deg)';
        templateObj.$.ti_widget_value5.label = Params.dataPath.azimuthResolution;*/
        showitem = 5;
      } else if (subset == 'Profiling') {
        templateObj.$.ti_widget_label1.label = 'Platform';
        templateObj.$.ti_widget_value1.label = Params.tlv_platform ? '0x'+Params.tlv_platform.toString(16) : undefined;
        templateObj.$.ti_widget_label2.label = 'SDK Version';
        templateObj.$.ti_widget_value2.label = Params.tlv_version ? Params.tlv_version.reverse().join('.') : undefined;
        showitem += 2;
        templateObj.$.ti_widget_label3.label = 'Number of Detected Objects';
        templateObj.$.ti_widget_value3.label = Params.numDetectedObj;
        showitem += 1;
        if (Params.guiMonitor.statsInfo == 1) {
            templateObj.$.ti_widget_label4.label = 'InterChirpProcessingMargin (usec)';
            templateObj.$.ti_widget_value4.label = MyUtil.sprintf(Params.interChirpProcessingMargin, 4);
            templateObj.$.ti_widget_label5.label = 'InterFrameProcessingMargin (usec)';
            templateObj.$.ti_widget_value5.label = MyUtil.sprintf(Params.interFrameProcessingMargin, 4);
            templateObj.$.ti_widget_label6.label = 'InterFrameProcessingTime (usec)';
            templateObj.$.ti_widget_value6.label = MyUtil.sprintf(Params.interFrameProcessingTime, 4);
            templateObj.$.ti_widget_label7.label = 'TransmitOutputTime (usec)';
            templateObj.$.ti_widget_value7.label = MyUtil.sprintf(Params.transmitOutputTime, 4);
            showitem += 4;
        }
      }
    }
    for (var idx=1; idx<=9; idx++) {
        templateObj.$['ti_widget_label'+idx].style.display = idx <= showitem ? 'block' : 'none';
        templateObj.$['ti_widget_value'+idx].style.display = idx <= showitem ? 'block' : 'none';
    }
};


var cmd_sender_listener = {
    // callback uses typical signature: function(error result)
    
    setCfg: function(cfg, sendCmd, clearConsole, callback) {
        // this is used for 3 cases: sending cfg commands, sensorStop, sensorStart 0 
        this.myCfg = []; // keep non-empty lines
        for (var idx=0; idx<cfg.length; idx++) {
            var s = cfg[idx].trim();
            //if (s.length >= 1 && s[0] === '%') continue;
            if (s.length>0) this.myCfg.push(s);
        }
        // TODO Do I need to prepend sensorStop and flushCfg if not found?
        this.myCallback = callback;
        this.myCmdIdx = 0;
        this.sendCmd = sendCmd;
        this.mode = 'setCfg';
        if (clearConsole) this.clearConsole();
        this.issueCmd();
    },
    askVersion: function(callback) {
        this.myCallback = callback;
        this.versionMessage = '';
        this.mode = 'askVersion';
        templateObj.$.CFG_port.sendValue('version');
    },
    clearConsole: function() {
     //   templateObj.$.ti_widget_textbox_cfg_console.value = '';
    },
    appendConsole: function(msg) {
   /*     if (templateObj.$.ti_widget_textbox_cfg_console.value.length > 10000)
            this.clearConsole();
        if (templateObj.$.ti_widget_textbox_cfg_console.value.length > 0)
            templateObj.$.ti_widget_textbox_cfg_console.value += '\n' + msg;
        else
            templateObj.$.ti_widget_textbox_cfg_console.value = msg;
        templateObj.$.ti_widget_textbox_cfg_console.scrollTop = 999999;*/
    },
    issueCmd: function() {
        if (this.myCfg && this.myCmdIdx < this.myCfg.length && this.sendCmd) {
            templateObj.$.CFG_port.sendValue(this.myCfg[this.myCmdIdx]);
        } else {
            this.callback(true);
        }
    },
    callback: function(end, error, result) {
        if (end) this.mode = '';
        if (this.myCallback) {
            this.myCallback(error, result);
        }
    },
    onDataReceived: function(data) {
        if (!data) return;
        // expect \r\n  or \n as delimters.  \n\r is strange. The gc backplane delimits by \n, which is good.
        if (this.mode == 'askVersion') {
            if (data == 'Done' || data == '\rDone') {// I see \rDone for apr 13 firmware
                this.callback(true, null, this.versionMessage);
            } else {
                if (this.versionMessage.length == 0 && data.endsWith('version')) {
                    // this looks like echoing the command send out, so ignore it
                } else  this.versionMessage += data;
            }
        } else if (this.mode == 'setCfg') {
            this.appendConsole(data);
            if (data == 'Skipped' || data == 'Done') {
                this.myCmdIdx = this.myCmdIdx+1;
                this.issueCmd();
            } else if (data.indexOf('Error ') >= 0) {
                this.callback(true, data);
            }
        }
    },
};

