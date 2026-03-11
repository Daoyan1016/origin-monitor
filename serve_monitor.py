#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import threading
import time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

import sync_live_data


ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
PORT = 8080
SYNC_INTERVAL = 60


def sync_loop():
    while True:
        try:
            sync_live_data.run_once()
        except Exception as exc:
            print(f"[serve_monitor] sync failed: {exc}")
        time.sleep(SYNC_INTERVAL)


def main():
    os.chdir(ROOT_DIR)

    thread = threading.Thread(target=sync_loop, daemon=True)
    thread.start()

    server = ThreadingHTTPServer(("127.0.0.1", PORT), SimpleHTTPRequestHandler)
    print(f"[serve_monitor] local site: http://localhost:{PORT}/")
    print(f"[serve_monitor] root: {ROOT_DIR}")
    server.serve_forever()


if __name__ == "__main__":
    main()
