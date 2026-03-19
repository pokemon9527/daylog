import urllib.request, json, sys

def api(method, path, data=None, token=None):
    url = 'http://localhost:8080' + path
    headers = {'Content-Type': 'application/json; charset=utf-8'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    body = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read().decode('utf-8'))

# Register
result = api('POST', '/api/v1/auth/register', {'email': 'utf8test@test.com', 'password': '123456', 'display_name': '中文用户UTF8'})
print('Register display_name:', result['user']['display_name'])
token = result['token']

# Get workspaces
ws = api('GET', '/api/v1/workspaces', token=token)
print('Workspace name:', ws[0]['name'])
ws_id = ws[0]['id']

# Create page
page = api('POST', '/api/v1/pages', {'workspace_id': ws_id, 'title': '测试页面'}, token)
page_id = page['id']
print('Page title:', page['title'])

# Create block
block = api('POST', '/api/v1/blocks', {'page_id': page_id, 'block_type': 'paragraph', 'content': '{}', 'props': '{}'}, token)
block_id = block['id']
print('Block created:', block_id)

# Update block with Chinese
content_obj = {'rich_text': [{'type': 'text', 'text': {'content': '你好世界ABC'}, 'plain_text': '你好世界ABC'}]}
api('PUT', f'/api/v1/blocks/{block_id}', {'content': json.dumps(content_obj)}, token)
print('Update done')

# Read back
block2 = api('GET', f'/api/v1/blocks/{block_id}', token=token)
saved = json.loads(block2['content'])
text = saved['rich_text'][0]['text']['content']
print('Saved text:', text)
print('Match:', text == '你好世界ABC')
