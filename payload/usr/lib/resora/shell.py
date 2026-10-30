#!/usr/bin/env python3
"""Киоск-оболочка Resora: полноэкранный WebKitGTK с интерфейсом и мостом к системе."""
import json, os, sys, threading
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gi
gi.require_version('Gtk', '4.0')
gi.require_version('WebKit', '6.0')
from gi.repository import Gtk, WebKit, GLib, Gio
import resora_bridge as bridge

UI = os.environ.get('RESORA_UI', '/usr/share/resora/index.html')

BRIDGE_JS = r'''
(function(){const pending={};let n=0;
window.ResoraNative={available:true,call(cmd,args){return new Promise((res,rej)=>{const id=++n;pending[id]={res,rej};
window.webkit.messageHandlers.resora.postMessage(JSON.stringify({id,cmd,args:args||{}}));});}};
window.__resoraReply=function(id,ok,data){const p=pending[id];if(!p)return;delete pending[id];ok?p.res(data):p.rej(new Error(data));};
})();
'''


def main():
    app = Gtk.Application(application_id='os.resora.Shell', flags=Gio.ApplicationFlags.NON_UNIQUE)

    def on_activate(app):
        win = Gtk.ApplicationWindow(application=app, title='Resora')
        win.set_decorated(False)
        win.fullscreen()
        data = os.path.expanduser('~/.local/share/resora')
        cache = os.path.expanduser('~/.cache/resora')
        os.makedirs(data, exist_ok=True)
        os.makedirs(cache, exist_ok=True)
        session = WebKit.NetworkSession.new(data, cache)
        ucm = WebKit.UserContentManager()
        ucm.add_script(WebKit.UserScript.new(BRIDGE_JS, WebKit.UserContentInjectedFrames.TOP_FRAME,
                                             WebKit.UserScriptInjectionTime.START, None, None))
        ucm.register_script_message_handler('resora', None)
        view = WebKit.WebView(user_content_manager=ucm, network_session=session)
        st = view.get_settings()
        st.set_enable_developer_extras(False)
        st.set_enable_write_console_messages_to_stdout(bool(os.environ.get('RESORA_DEBUG')))
        st.set_allow_file_access_from_file_urls(True)
        st.set_media_playback_requires_user_gesture(False)

        def reply(mid, ok, payload):
            js = f'window.__resoraReply({json.dumps(mid)},{json.dumps(ok)},{json.dumps(payload)})'
            view.evaluate_javascript(js, -1, None, None, None, None, None)
            return False

        def on_message(manager, value):
            raw = value.to_string()

            def work():
                mid, ok, payload = bridge.dispatch(raw)
                GLib.idle_add(reply, mid, ok, payload)
            threading.Thread(target=work, daemon=True).start()

        ucm.connect('script-message-received::resora', on_message)

        def on_policy(v, decision, dtype):
            # Интерфейс не должен уходить на внешние адреса: внешние страницы открывает только браузер.
            if dtype == WebKit.PolicyDecisionType.NAVIGATION_ACTION:
                uri = decision.get_navigation_action().get_request().get_uri() or ''
                if not uri.startswith('file://') and not uri.startswith('about:'):
                    decision.ignore()
                    return True
            return False
        view.connect('decide-policy', on_policy)
        win.set_child(view)
        win.present()
        view.load_uri('file://' + UI)

    app.connect('activate', on_activate)
    sys.exit(app.run(None))


if __name__ == '__main__':
    main()
