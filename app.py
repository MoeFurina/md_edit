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
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_file
from flask_apscheduler import APScheduler
from werkzeug.utils import secure_filename
import sqlite3

app = Flask(__name__)
app.secret_key = 'your-secret-key-here-change-this-in-production'

# 数据库配置
DB_CONFIG = {
    'database': 'markdown_editor.db'  # SQLite数据库文件路径
}

# 初始化APScheduler
scheduler = APScheduler()
scheduler.init_app(app)
scheduler.start()

# 文件上传配置
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_db_connection():
    """获取数据库连接"""
    conn = sqlite3.connect(DB_CONFIG['database'])
    conn.row_factory = sqlite3.Row  # 使查询结果可以像字典一样访问
    return conn

def initialize_database():
    """初始化数据库和表结构"""
    try:
        # 如果数据库文件存在，删除它以实现每次重启都清空数据
        if os.path.exists(DB_CONFIG['database']):
            os.remove(DB_CONFIG['database'])
            print(f"已删除现有数据库文件: {DB_CONFIG['database']}")

        # 创建新的数据库连接
        conn = get_db_connection()
        cursor = conn.cursor()

        # 创建用户表 (SQLite使用AUTOINCREMENT，但需要INTEGER PRIMARY KEY)
        cursor.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # 创建初始化标记表
        cursor.execute("""
        CREATE TABLE init_status (
            id INTEGER PRIMARY KEY DEFAULT 1,
            initialized BOOLEAN DEFAULT 1,
            init_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # 插入初始化标记
        cursor.execute("""
        INSERT INTO init_status (id, initialized) VALUES (1, 1)
        """)

        conn.commit()
        cursor.close()
        conn.close()

        print("SQLite数据库重新初始化完成")
        return True

    except Exception as e:
        print(f"数据库初始化失败: {e}")
        return False

# 删除了is_database_initialized函数，因为每次启动都要强制重新初始化

def clean_all_user_files():
    """清理所有用户文件（uploads和output目录）"""
    try:
        # 清理uploads目录
        if os.path.exists(UPLOAD_FOLDER):
            shutil.rmtree(UPLOAD_FOLDER)
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            os.chmod(UPLOAD_FOLDER, 0o755)
            print("已清理uploads目录")

        # 清理output目录
        output_dir = 'output'
        if os.path.exists(output_dir):
            shutil.rmtree(output_dir)
            os.makedirs(output_dir, exist_ok=True)
            os.chmod(output_dir, 0o755)
            print("已清理output目录")

    except Exception as e:
        print(f"清理用户文件失败: {e}")

def generate_random_filename(extension):
    """生成随机文件名"""
    random_str = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
    return f"{random_str}.{extension}"

def ensure_upload_dirs():
    """确保上传目录存在"""
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        os.chmod(UPLOAD_FOLDER, 0o755)

def clean_output_directory():
    """清理output目录中的所有文件和子目录"""
    try:
        output_dir = 'output'
        if os.path.exists(output_dir):
            shutil.rmtree(output_dir)
            os.makedirs(output_dir, exist_ok=True)
            os.chmod(output_dir, 0o755)
            print("已清理output目录")
    except Exception as e:
        print(f"清理output目录失败: {e}")

def clean_old_files():
    """清理旧文件和用户数据"""
    try:
        # 清理uploads目录
        if os.path.exists(UPLOAD_FOLDER):
            shutil.rmtree(UPLOAD_FOLDER)
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            os.chmod(UPLOAD_FOLDER, 0o755)
            print("已清理uploads目录")

        # 清理用户数据（保留表结构）
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users")
        conn.commit()
        cursor.close()
        conn.close()
        print("已清理用户数据")

    except Exception as e:
        print(f"清理失败: {e}")

# 定时任务：每日凌晨3点清理
@scheduler.task('cron', id='daily_clean', hour=3, minute=0)
def daily_clean_task():
    clean_old_files()

# 定时任务：每小时清理output目录
@scheduler.task('cron', id='hourly_output_clean', hour='*', minute=0)
def hourly_output_clean_task():
    clean_output_directory()

# 路由：首页
@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('editor.html', timestamp=int(time.time()))

# 路由：登录页面
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        conn = get_db_connection()
        cursor = conn.cursor()

        # 检查用户是否存在
        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()

        if user:
            # 验证密码
            if user['password'] == password:
                session['user_id'] = user['id']
                session['username'] = user['username']
                session.permanent = True
                return redirect(url_for('index'))
            else:
                return render_template('login.html', error='密码错误')
        else:
            # 自动注册用户
            cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)", (username, password))
            conn.commit()
            cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
            user = cursor.fetchone()
            session['user_id'] = user['id']
            session['username'] = user['username']
            session.permanent = True
            return redirect(url_for('index'))

        cursor.close()
        conn.close()

    return render_template('login.html')

# 路由：登出
@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# 路由：上传图片
@app.route('/upload_image', methods=['POST'])
def upload_image():
    if 'user_id' not in session:
        return jsonify({'error': '请先登录'}), 401

    try:
        # 检查是否有文件
        if 'image' not in request.files:
            return jsonify({'error': '没有文件'}), 400

        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': '没有选择文件'}), 400

        # 检查文件大小
        file.seek(0, 2)  # 移动到文件末尾
        file_size = file.tell()
        file.seek(0)  # 重置文件指针

        if file_size > MAX_FILE_SIZE:
            return jsonify({'error': '文件大小超过10MB限制'}), 400

        # 检查文件类型
        if not allowed_file(file.filename):
            return jsonify({'error': '不支持的文件类型'}), 400

        # 生成文件路径
        user_id = session['user_id']
        today = datetime.now().strftime('%Y-%m-%d')
        filename = generate_random_filename(file.filename.rsplit('.', 1)[1].lower())

        user_folder = os.path.join(UPLOAD_FOLDER, str(user_id))
        date_folder = os.path.join(user_folder, today)

        os.makedirs(date_folder, exist_ok=True)
        os.chmod(user_folder, 0o755)
        os.chmod(date_folder, 0o755)

        file_path = os.path.join(date_folder, filename)
        file.save(file_path)

        # 返回文件URL
        file_url = f"/{UPLOAD_FOLDER}/{user_id}/{today}/{filename}"

        return jsonify({
            'success': True,
            'url': file_url,
            'filename': filename
        })

    except Exception as e:
        print(f"上传图片失败: {e}")
        return jsonify({'error': '上传失败'}), 500

# 路由：获取网页标题
@app.route('/get_title', methods=['POST'])
def get_title():
    if 'user_id' not in session:
        return jsonify({'error': '请先登录'}), 401

    try:
        data = request.json
        url = data.get('url')

        if not url:
            return jsonify({'error': 'URL不能为空'}), 400

        # 验证URL格式
        if not (url.startswith('http://') or url.startswith('https://')):
            return jsonify({'error': 'URL格式不正确，必须以http://或https://开头'}), 400

        # 获取网页内容
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        }

        try:
            response = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
            response.raise_for_status()
        except requests.exceptions.Timeout:
            return jsonify({'error': '请求超时，请稍后重试'}), 400
        except requests.exceptions.ConnectionError:
            return jsonify({'error': '无法连接到服务器，请检查URL'}), 400
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                return jsonify({'error': '网页不存在'}), 400
            elif e.response.status_code == 403:
                return jsonify({'error': '访问被拒绝'}), 400
            else:
                return jsonify({'error': f'HTTP错误: {e.response.status_code}'}), 400

        # 解析HTML获取标题
        try:
            soup = BeautifulSoup(response.content, 'html.parser')

            # 尝试多种方式获取标题
            title = None
            if soup.title and soup.title.string:
                title = soup.title.string.strip()

            # 如果标准标题获取失败，尝试其他方式
            if not title:
                # 尝试获取og:title
                og_title = soup.find('meta', property='og:title')
                if og_title and og_title.get('content'):
                    title = og_title.get('content').strip()

            if not title:
                # 尝试获取h1
                h1_tag = soup.find('h1')
                if h1_tag:
                    title = h1_tag.get_text().strip()

            if not title:
                return jsonify({'error': '无法获取网页标题'}), 400

            return jsonify({'title': title})

        except Exception as e:
            print(f"解析HTML失败: {e}")
            return jsonify({'error': '解析网页失败'}), 400

    except Exception as e:
        print(f"获取标题异常: {e}")
        return jsonify({'error': '服务器内部错误'}), 500

# 路由：提供uploads文件访问
@app.route('/uploads/<path:filename>')
def uploaded_files(filename):
    if 'user_id' not in session:
        return jsonify({'error': '请先登录'}), 401

    file_path = os.path.join(os.getcwd(), 'uploads', filename)

    if not os.path.exists(file_path):
        return jsonify({'error': '文件不存在'}), 404

    # 检查文件是否属于当前用户
    user_id = session['user_id']
    if not filename.startswith(str(user_id) + '/'):
        return jsonify({'error': '无权访问'}), 403

    return send_file(file_path)

# 路由：导出Markdown
@app.route('/export', methods=['POST'])
def export_markdown():
    if 'user_id' not in session:
        return jsonify({'error': '请先登录'}), 401

    try:
        data = request.json
        content = data.get('content', '')
        images = data.get('images', [])
        image_path = data.get('image_path', '/image')

        # 验证图片路径格式
        if not image_path.startswith('/'):
            return jsonify({'error': '图片路径必须以/开头'}), 400

        # 创建output目录（如果不存在）
        output_dir = 'output'
        os.makedirs(output_dir, exist_ok=True)

        # 创建用户专用的输出子目录
        user_output_dir = os.path.join(output_dir, f'user_{session["user_id"]}_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
        os.makedirs(user_output_dir, exist_ok=True)

        # 创建图片目录（去掉开头的/）
        if images:
            # 确保路径不以/开头
            relative_path = image_path.lstrip('/')
            image_dir = os.path.join(user_output_dir, relative_path)
            os.makedirs(image_dir, exist_ok=True)

        # 处理图片并更新内容 - 统一使用HTML格式的图片路径
        for img in images:
            original_url = img['url']
            filename = img['filename']

            # 复制图片文件
            src_path = original_url.lstrip('/')
            dst_path = os.path.join(image_dir, filename)

            if os.path.exists(src_path):
                shutil.copy2(src_path, dst_path)

            # 更新内容中的图片路径 - 统一使用HTML格式的src路径
            new_path = f"{image_path}/{filename}"
            content = content.replace(original_url, new_path)

        # 写入Markdown文件
        md_filename = f'export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.md'
        md_path = os.path.join(user_output_dir, md_filename)

        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(content)

        # 创建ZIP文件
        zip_filename = f'markdown_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.zip'
        zip_path = os.path.join(user_output_dir, zip_filename)

        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # 添加Markdown文件
            zipf.write(md_path, md_filename)

            # 添加图片文件
            if images:
                for root, dirs, files in os.walk(image_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, user_output_dir)
                        zipf.write(file_path, arcname)

        # 清理临时文件（除了ZIP文件）
        os.remove(md_path)
        if images and os.path.exists(image_dir):
            shutil.rmtree(image_dir)

        # 发送ZIP文件
        return send_file(zip_path, as_attachment=True, download_name=zip_filename)

    except Exception as e:
        print(f"导出失败: {e}")
        print(f"错误类型: {type(e).__name__}")
        import traceback
        print(f"错误追踪: {traceback.format_exc()}")
        return jsonify({'error': f'导出失败: {str(e)}'}), 500

if __name__ == '__main__':
    # 确保上传目录存在
    ensure_upload_dirs()

    print("正在初始化数据库...")
    if initialize_database():
        print("数据库初始化成功")
    else:
        print("数据库初始化失败，请检查数据库配置")
        sys.exit(1)

    print("正在清理所有用户文件...")
    clean_all_user_files()
    print("用户文件清理完成")

    # 设置session过期时间为30分钟
    app.permanent_session_lifetime = timedelta(minutes=30)

    print("服务器启动在 http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)