import http.server
import socketserver
import os
import urllib.parse
import webbrowser
import sys
import mimetypes

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# Ensure proper mime types
mimetypes.add_type('image/svg+xml', '.svg')
mimetypes.add_type('image/png', '.png')
mimetypes.add_type('image/jpeg', '.jpg')
mimetypes.add_type('image/jpeg', '.jpeg')
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('application/json', '.json')

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS and disable aggressive caching for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, must-revalidate')
        super().end_headers()

    def do_GET(self):
        # Decode URL path properly (handling spaces, special chars)
        decoded_path = urllib.parse.unquote(self.path)
        
        # Route /photos/... to photos folder or KARTU OSIS folder
        if decoded_path.startswith('/photos/'):
            subpath = decoded_path[len('/photos/'):]
            target_path = os.path.join(DIRECTORY, 'photos', subpath)
            if not os.path.exists(target_path):
                target_path = os.path.join(DIRECTORY, 'KARTU OSIS KELAS X THN 2026-2027', subpath)
            if os.path.exists(target_path) and os.path.isfile(target_path):
                self.send_response(200)
                mime_type, _ = mimetypes.guess_type(target_path)
                self.send_header('Content-Type', mime_type or 'image/jpeg')
                self.send_header('Content-Length', str(os.path.getsize(target_path)))
                self.end_headers()
                with open(target_path, 'rb') as f:
                    self.wfile.write(f.read())
                return
            else:
                self.send_error(404, f"Photo not found: {subpath}")
                return

        # Route /dataqr/... directly to dataqr folder
        if decoded_path.startswith('/dataqr/'):
            subpath = decoded_path[len('/dataqr/'):]
            target_path = os.path.join(DIRECTORY, 'dataqr', subpath)
            if os.path.exists(target_path) and os.path.isfile(target_path):
                self.send_response(200)
                mime_type, _ = mimetypes.guess_type(target_path)
                self.send_header('Content-Type', mime_type or 'image/png')
                self.send_header('Content-Length', str(os.path.getsize(target_path)))
                self.end_headers()
                with open(target_path, 'rb') as f:
                    self.wfile.write(f.read())
                return
            else:
                self.send_error(404, f"QR code not found: {subpath}")
                return

        return super().do_GET()

def run_server():
    os.chdir(DIRECTORY)
    # Allow port reuse
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        url = f"http://localhost:{PORT}"
        print("=" * 60)
        print(f"  SMKN CIPATUJAH - ID CARD STUDIO SERVER")
        print(f"  Server berjalan di: {url}")
        print(f"  Tekan Ctrl+C untuk menghentikan server.")
        print("=" * 60)
        if '--no-browser' not in sys.argv:
            try:
                webbrowser.open(url)
            except Exception:
                pass
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer dihentikan.")

if __name__ == '__main__':
    run_server()

