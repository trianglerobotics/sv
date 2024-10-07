import cv2
import numpy as np
import requests
import base64
import platform
import jajucha2

url = ''

architecture = platform.machine()

if(platform.machine() == 'aarch64'):
    url = 'http://121.184.63.113:4000/center'
elif(platform.machine() == 'x86_64'):
    url = 'http://121.184.63.113:4000/center'

while True:
    frame = jajucha2.camera.get_image()
    resized_frame = cv2.resize(frame, (640, 640))
    _, buffer = cv2.imencode('.jpg', resized_frame)
    jpg_as_text = base64.b64encode(buffer).decode('utf-8')

    data = {'image': jpg_as_text}
    response = requests.post(url, json=data)

    if response.status_code != 200:
        print('Failed to send data')

