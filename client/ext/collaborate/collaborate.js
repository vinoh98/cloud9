/**
 * Collaboration extension for the Cloud9 IDE
 *
 * @copyright 2010, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
 
define(function(require, exports, module) {

var ide    = require("core/ide");
var ext    = require("core/ext");
var util   = require("core/util");
var dock   = require("ext/dockpanel/dockpanel");
var markup = require("text!ext/collaborate/collaborate.xml");

return ext.register("ext/collaborate/collaborate", {
    name            : "Collaboration",
    dev             : "Ajax.org",
    alone           : true,
    type            : ext.GENERAL,
    markup          : markup,
    commands        : {},
    hotitems        : {},
    
    nodes : [],

    openChat : function(listItem) {

        var chatUserID = listItem.getAttribute("user_id");
        var chatIdent  = this.name + chatUserID;
        
        // Check to see if window exists already. If so, select it (2nd arg)
        if(dock.windowExists(chatIdent, true)) {
            return false;   
        }

        tempChatWindow = new apf.modalwindow({
            htmlNode   : document.body,
            id         : "chatUser" + chatUserID,
            onhide     : "require('ext/collaborate/collaborate').onChatHide("
                            + chatUserID + ")",
            onshow     : "require('ext/collaborate/collaborate').onChatShow("
                            + chatUserID + ")",
            title      : listItem.getAttribute("user_name"),
            visible    : false,
            right      : "42",
            width      : "250",
            height     : "350",
            modal      : false,
            draggable  : false,
            skin       : "todowin",
            childNodes : [
                new apf.toolbar({
                  childNodes : [
                    new apf.bar({
                      height     : 36,
                      childNodes : [
                        new apf.hbox({
                          edge : 5
                        })
                      ]
                    })
                  ]
                }),
                new apf.panel({
                    skin    : "todopanel",
                    visible : "true",
                    flex    : "1",
                    childNodes : [
                        new apf.hbox({
                            height     : "243",
                            edge       : "3 0 5 7",
                            childNodes : [
                                new apf.text({
                                    id         : "txtChat" + chatUserID,
                                    margin     : "3 0 0 0",
                                    height     : "*",
                                    flex       : "1",
                                    scrolldown : "true",
                                    textselect : "true",
                                    focussable : "true",
                                    'class'    : "chat_text"
                                }),
                                
                                new apf.scrollbar({
                                    'for'     : "txtChat" + chatUserID,
                                    id        : "sbChat" + chatUserID,
                                    height    : "*",
                                    margin    : "0",
                                    skin      : "sbcollaborators",
                                    width     : "9"
                                })
                            ]
                        }),
                        new apf.hbox({
                            height     : "41",
                            edge       : "8 7 7 7",
                            'class'    : "hboxchatinput",
                            childNodes : [
                                new apf.textarea({
                                    flex      : "1",
                                    height    : "24"
                                })
                            ]
                        })
                    ]
                })
            ]
        });

        dock.registerWindow(tempChatWindow, {
                dockPosition: "bottom",
                backgroundImage: "/static/style/images/collaboration_panel_sprite.png",
                defaultState: { x: 0, y: -360 },
                activeState: { x: 0, y: -400 }
            },
            
            chatIdent, // Window identifer
            true    // Force this chat window to show right away
        );
        
        cta = eval("chatUser" + chatUserID).selectSingleNode("panel/hbox[2]/textarea");
        
        var _self = this;

        cta.onkeydown = function(event) {
            if(event.keyCode == 13) {
                event.preventDefault();

                var chatInput = event.currentTarget.getValue();
                if(chatInput != "") {
                    _self.appendToChatWin(chatUserID, 'chatmessage',
                                            {
                                                message: chatInput,
                                                fromMe: true
                                            }
                                        );
                    eval("sbChat" + chatUserID).setPosition(1);
                    
                    // Reset heights of elements if they have been modified
                    if(this.getHeight() > 24) {
                        this.setHeight(24);
                        tcu = eval("chatUser" + chatUserID);
                        tcu.selectSingleNode("panel/hbox[1]").setHeight(243);
                        tcu.selectSingleNode("panel/hbox[2]").setHeight(41);
                    }
                }
                
                event.currentTarget.clear();
                return false;
            }
        };
        
        cta.onkeyup = function(event) {
            // For every keypress besides [enter] and [tab], we will process
            // the height of the 
            if(event.keyCode != 9){
                if(event.htmlEvent) {
                    if(event.htmlEvent.target.clientHeight < 
                            event.htmlEvent.target.scrollHeight) {
                        if(this.getHeight() < 65) {
                            this.setHeight(this.getHeight() + 15);
                            tcu = eval("chatUser" + chatUserID);
                            tcu.selectSingleNode("panel/hbox[1]").setHeight(
                                tcu.selectSingleNode("panel/hbox[1]").getHeight()
                                    - 15
                            );
                            
                            tcu.selectSingleNode("panel/hbox[2]").setHeight(
                                tcu.selectSingleNode("panel/hbox[2]").getHeight()
                                    + 15
                            );
                        }
                    }
                }
            }
        };
        
        cta.focus();
    },
    
    closeChat: function(ev, anchorEl){
        ev.preventDefault();
    },
    
    /**
     * Get the scrollbar position when the window hides so we can reset it
     * when it is re-shown. For WebKit-based browsers.
     */
    onChatHide: function(userID){
        if(apf.isWebkit) {
            tUserSB = eval("sbChat" + userID);
            // Store this somewhere...
            collaborators.queryNode("item[@user_id=" 
                    + userID + "]").setAttribute("sb_pos", tUserSB.getPosition());
        }
    },
    
    onChatShow: function(userID){
        if(apf.isWebkit) {
            sb_pos = collaborators.queryNode("item[@user_id=" + userID
                        + "]").getAttribute("sb_pos");
            eval("sbChat" + userID).setPosition(sb_pos);
        }
        
        eval("chatUser" + userID).selectSingleNode("panel/hbox[2]/textarea").focus();
    },

    appendToChatWin: function(userID, type, messageDetails){
        txtOutputWin = eval("txtChat" + userID);
        
        switch(type){
            case 'chatmessage':
                var outStr = '<div class="chat_message_block">';
                if(messageDetails.fromMe == true) {
                    outStr += '<div class="chat_me_header">\
                                    <span class="chat_msg_name">You</span>\
                                    <span class="chat_msg_timestamp">12:01 AM</span></div>\
                                  <div class="chat_message">'
                                  + messageDetails.message + '</div>'
                }
                
                outStr += '</div>';
                
                txtOutputWin.addValue(outStr);
                break;
        }
    },

    init : function(amlNode){
        this.panel = winCollaborators;
        dock.registerWindow(winCollaborators, {
            dockPosition: "top",
            backgroundImage: "/static/style/images/collaboration_panel_sprite.png",
            defaultState: { x: 0, y: -243 },
            activeState: { x: 0, y: -281 }
        });
    },
    
    enable : function(){
        this.nodes.each(function(item){
            item.enable();
        });
    },
    
    disable : function(){
        this.nodes.each(function(item){
            item.disable();
        });
    },
    
    destroy : function(){
        this.nodes.each(function(item){
            item.destroy(true, true);
        });
        this.nodes = [];
        dock.unregister(this);
        this.winTodo.destroy(true, true);
    }
});

    }
);