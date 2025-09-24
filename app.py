#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import json
import random
import string
import time
import zipfile
import shutil
from datetime import datetime, timedelta
import requests
from bs4 import BeautifulSoup
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_file
from flask_apscheduler import APScheduler
from werkzeug.utils import secure_filename
import redis
from dotenv import load_dotenv

# 加载 .env 配置
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "default-secret")

# Redis 配置 (Upstash)
redis_client = redis.Redis.from_url(
    os.getenv("UPSTASH_REDIS_URL"),
    password=os.getenv("UPSTASH_REDIS_TOKEN")
)

# 初始化APScheduler
scheduler = APScheduler()
scheduler.init_app(app)
scheduler.start()

# 文件上传配置
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER


# ---------------- Redis 用户管理 ----------------
def get_user(username):
    """获取用户"""
    user = redis_client.hgetall(f"user:{username}")
    if not user:
        return None
    return {k.decode(): v.decode() for k, v in user.items()}

def create_user(username, password):
    """创建用户"""
    redis_client.hset(f"user:{username}", mapping={
        "username": username,
        "password": password,
        "created_at": datetime.now().isoformat()
    })
    return get_user(username)

def validate_user(username, password):
    """验证密码"""
    user = get_user(username)
    if not user:
        return False
    return user["password"] == password

def delete_all_users():
    """清空所有用户"""
    keys = redis_client.keys("user:*")
    if keys:
        redis_client.delete(*keys)
    print("已清空所有用户数据")


# ---------------- 工具函数 ----------------
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_random_filename(extension):
    random_str = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
    return f"{random_str}.{extension}"

def ensure_upload_dirs():
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        os.chmod(UPLOAD_FOLDER, 0o755)

def clean_all_user_files():
    try:
        if os.path.exists(UPLOAD_FOLDER):
            shutil.rmtree(UPLOAD_FOLDER)
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        os.chmod(UPLOAD_FOLDER, 0o755)
        print("已清理uploads目录")

        output_dir = 'output'
        if os.path.exists(output_dir):
            shutil.rmtree(output_dir)
        os.makedirs(output_dir, exist_ok=True)
        os.chmod(output_dir, 0o755)
        print("已清理output目录")

    except Exception as e:
        print(f"清理用户文件失败: {e}")

def clean_output_directory():
    try:
        output_dir = 'output'
        if os.path.exists(output_dir):
            shutil.rmtree(output_dir)
        os.makedirs(output_dir, exist_ok=True)
        os.chmod(output_dir, 0o755)
        print("已清理output目录")
    except Exception as e:
        print(f"清理output目录失败: {e}")


# ---------------- 定时任务 ----------------
@scheduler.task('cron', id='daily_clean', hour=3, minute=0)
def daily_clean_task():
    clean_all_user_files()
    delete_all_users()

@scheduler.task('cron', id='hourly_output_clean', hour='*', minute=0)
def hourly_output_clean_task():
    clean_output_directory()


# ---------------- 路由 ----------------
@app.route('/')
def index():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('editor.html', timestamp=int(time.time()))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        user = get_user(username)
        if user:
            if validate_user(username, password):
                session['username'] = username
                session.permanent = True
                return redirect(url_for('index'))
            else:
                return render_template('login.html', error='密码错误')
        else:
            create_user(username, password)
            session['username'] = username
            session.permanent = True
            return redirect(url_for('index'))

    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/upload_image', methods=['POST'])
def upload_image():
    if 'username' not in session:
        return jsonify({'error': '请先登录'}), 401
    try:
        if 'image' not in request.files:
            return jsonify({'error': '没有文件'}), 400

        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': '没有选择文件'}), 400

        file.seek(0, 2)
        file_size = file.tell()
        file.seek(0)

        if file_size > MAX_FILE_SIZE:
            return jsonify({'error': '文件大小超过10MB限制'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': '不支持的文件类型'}), 400

        username = session['username']
        today = datetime.now().strftime('%Y-%m-%d')
        filename = generate_random_filename(file.filename.rsplit('.', 1)[1].lower())

        user_folder = os.path.join(UPLOAD_FOLDER, username)
        date_folder = os.path.join(user_folder, today)

        os.makedirs(date_folder, exist_ok=True)
        os.chmod(user_folder, 0o755)
        os.chmod(date_folder, 0o755)

        file_path = os.path.join(date_folder, filename)
        file.save(file_path)

        file_url = f"/{UPLOAD_FOLDER}/{username}/{today}/{filename}"
        return jsonify({'success': True, 'url': file_url, 'filename': filename})

    except Exception as e:
        print(f"上传图片失败: {e}")
        return jsonify({'error': '上传失败'}), 500


@app.route('/get_title', methods=['POST'])
def get_title():
    if 'username' not in session:
        return jsonify({'error': '请先登录'}), 401
    try:
        data = request.json
        url = data.get('url')
        if not url:
            return jsonify({'error': 'URL不能为空'}), 400
        if not (url.startswith('http://') or url.startswith('https://')):
            return jsonify({'error': 'URL格式不正确'}), 400

        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        title = soup.title.string.strip() if soup.title else None
        if not title:
            return jsonify({'error': '无法获取网页标题'}), 400
        return jsonify({'title': title})
    except Exception as e:
        print(f"获取标题失败: {e}")
        return jsonify({'error': '解析失败'}), 400


@app.route('/uploads/<path:filename>')
def uploaded_files(filename):
    if 'username' not in session:
        return jsonify({'error': '请先登录'}), 401
    file_path = os.path.join(os.getcwd(), 'uploads', filename)
    if not os.path.exists(file_path):
        return jsonify({'error': '文件不存在'}), 404
    if not filename.startswith(session['username'] + '/'):
        return jsonify({'error': '无权访问'}), 403
    return send_file(file_path)


@app.route('/export', methods=['POST'])
def export_markdown():
    if 'username' not in session:
        return jsonify({'error': '请先登录'}), 401
    try:
        data = request.json
        content = data.get('content', '')
        images = data.get('images', [])
        image_path = data.get('image_path', '/image')

        if not image_path.startswith('/'):
            return jsonify({'error': '图片路径必须以/开头'}), 400

        output_dir = 'output'
        os.makedirs(output_dir, exist_ok=True)
        user_output_dir = os.path.join(output_dir, f'{session["username"]}_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
        os.makedirs(user_output_dir, exist_ok=True)

        if images:
            relative_path = image_path.lstrip('/')
            image_dir = os.path.join(user_output_dir, relative_path)
            os.makedirs(image_dir, exist_ok=True)

        for img in images:
            original_url = img['url']
            filename = img['filename']
            src_path = original_url.lstrip('/')
            dst_path = os.path.join(image_dir, filename)
            if os.path.exists(src_path):
                shutil.copy2(src_path, dst_path)
            new_path = f"{image_path}/{filename}"
            content = content.replace(original_url, new_path)

        md_filename = f'export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.md'
        md_path = os.path.join(user_output_dir, md_filename)
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(content)

        zip_filename = f'markdown_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.zip'
        zip_path = os.path.join(user_output_dir, zip_filename)
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            zipf.write(md_path, md_filename)
            if images:
                for root, dirs, files in os.walk(image_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, user_output_dir)
                        zipf.write(file_path, arcname)

        os.remove(md_path)
        if images and os.path.exists(image_dir):
            shutil.rmtree(image_dir)

        return send_file(zip_path, as_attachment=True, download_name=zip_filename)

    except Exception as e:
        print(f"导出失败: {e}")
        return jsonify({'error': f'导出失败: {str(e)}'}), 500


if __name__ == '__main__':
    ensure_upload_dirs()
    print("正在清理所有用户文件...")
    clean_all_user_files()
    print("用户文件清理完成")

    app.permanent_session_lifetime = timedelta(minutes=30)
    print("服务器启动在 http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
