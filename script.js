// 1. ตั้งค่า Firebase (ใช้ข้อมูลเดิมของคุณ)
const firebaseConfig = {
    apiKey: "AIzaSyANA3-UyKf-MS2dcmbAuPGt-KtRd0KTmGw",
    authDomain: "note-communitycar.firebaseapp.com",
    databaseURL: "https://note-communitycar-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "note-communitycar",
    storageBucket: "note-communitycar.appspot.com",
    messagingSenderId: "387457886547",
    appId: "1:387457886547:web:d7e5f60fb7d2cdbf3ed9a6"
};

// เริ่มต้น Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// API Key สำหรับฝากรูป (ImgBB)
const IMGBB_API_KEY = '5a3de96d3f6deddc05d65dc1928e466b';

// ตัวแปรควบคุมระบบ
let isAdmin = false;
let editMode = false;
let editKey = null;
let existingImgUrl = null;

// ฟังก์ชันปิด Welcome Popup
function closeWelcome() {
    document.getElementById('welcomePopup').style.display = 'none';
}

// ฟังก์ชันจัดการระบบแอดมิน
function handleAdmin() {
    if (!isAdmin) {
        // ในอนาคตเราจะเปลี่ยนจาก prompt เป็น Firebase Auth เพื่อความปลอดภัยระดับสูงสุด
        const pass = prompt("กรุณาใส่รหัสผ่านแอดมิน:");
        if (pass === "Note#2026!Car@Phupha99") {
            isAdmin = true;
            document.getElementById('adminPanel').style.display = 'block';
            document.getElementById('adminBtn').innerText = "🚪 ออกจากระบบ";
            document.getElementById('adminBtn').style.background = "#dc2626";
            renderCars(); // วาดรายการรถใหม่เพื่อให้ปุ่ม แก้ไข/ลบ แสดงขึ้นมา
            alert("ยินดีต้อนรับคุณโน้ต! เข้าสู่ระบบแอดมินถาวรแล้ว");
        } else {
            alert("รหัสผ่านไม่ถูกต้อง!");
        }
    } else {
        isAdmin = false;
        document.getElementById('adminPanel').style.display = 'none';
        document.getElementById('adminBtn').innerText = "⚙️ แอดมิน";
        document.getElementById('adminBtn').style.background = "rgba(255,255,255,0.2)";
        renderCars();
    }
}

// ฟังก์ชันอัปเดตชื่อไฟล์ที่เลือก
function updateLabel() {
    const file = document.getElementById('carFile').files[0];
    const label = document.querySelector('.file-label');
    if (file) {
        label.innerText = "✅ เลือกรูปแล้ว: " + file.name;
        label.style.borderColor = "#16a34a";
        label.style.color = "#16a34a";
    }
}

// ฟังก์ชันอัปโหลดและบันทึกข้อมูล
async function startUpload() {
    const title = document.getElementById('carTitle').value.trim();
    const price = document.getElementById('carPrice').value.trim();
    const file = document.getElementById('carFile').files[0];
    const status = document.getElementById('carStatus').value;
    const uploadBtn = document.getElementById('uploadBtn');

    if (!title || !price) {
        return alert("กรุณากรอกชื่อรุ่นและราคาให้ครบถ้วน");
    }

    uploadBtn.disabled = true;
    uploadBtn.innerText = "กำลังบันทึกข้อมูล...";

    try {
        let finalImageUrl = existingImgUrl;

        // ถ้ามีการเลือกไฟล์ใหม่ ให้ส่งไปที่ ImgBB
        if (file) {
            const formData = new FormData();
            formData.append('image', file);
            
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            
            if (data.success) {
                finalImageUrl = data.data.url;
            } else {
                throw new Error("อัปโหลดรูปภาพไม่สำเร็จ");
            }
        }

        if (!finalImageUrl) {
            throw new Error("กรุณาเลือกรูปภาพรถ");
        }

        const carData = {
            title: title,
            price: price,
            img: finalImageUrl,
            status: status,
            lastUpdate: Date.now()
        };

        if (editMode) {
            await db.ref(`cars/${editKey}`).update(carData);
            alert("อัปเดตข้อมูลเรียบร้อย!");
        } else {
            await db.ref('cars').push({
                ...carData,
                time: Date.now()
            });
            alert("ลงประกาศรถเรียบร้อย!");
        }

        resetForm();
    } catch (err) {
        alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerText = editMode ? "บันทึกการแก้ไข" : "ลงประกาศ";
    }
}

// ฟังก์ชันล้างฟอร์ม
function resetForm() {
    editMode = false;
    editKey = null;
    existingImgUrl = null;
    document.getElementById('carTitle').value = "";
    document.getElementById('carPrice').value = "";
    document.getElementById('carFile').value = "";
    document.getElementById('carStatus').value = "available";
    document.querySelector('.file-label').innerText = "📁 เลือกรูปภาพ";
    document.getElementById('cancelEditBtn').style.display = 'none';
    document.getElementById('uploadBtn').innerText = "ลงประกาศ";
}

function cancelEdit() {
    resetForm();
}

// ฟังก์ชันดึงข้อมูลมาแสดง (Realtime)
function renderCars() {
    db.ref('cars').on('value', snapshot => {
        const list = document.getElementById('carList');
        list.innerHTML = "";
        const data = snapshot.val();
        
        if (data) {
            // เรียงลำดับจากใหม่ไปเก่า
            const keys = Object.keys(data).reverse();
            
            keys.forEach(key => {
                const car = data[key];
                const card = `
                    <div class="car-card">
                        <div class="status-tag ${car.status === 'available' ? 'tag-available' : 'tag-sold'}">
                            ${car.status === 'available' ? '🟢 ยังมีอยู่' : '🔴 ขายแล้ว'}
                        </div>
                        <img src="${car.img}" class="car-img" loading="lazy">
                        <div class="details">
                            <h2 style="margin:0; font-size:1.1rem;">${car.title}</h2>
                            <div class="price">฿${car.price}</div>
                            
                            <div class="contact-area">
                                <a href="https://m.me/note.notety.5" target="_blank" class="btn-contact btn-facebook">แชท Facebook</a>
                                <a href="tel:0835255642" class="btn-contact btn-phone">โทรติดต่อ</a>
                            </div>

                            ${isAdmin ? `
                                <div class="admin-controls" style="display:flex; gap:10px; margin-top:10px;">
                                    <button class="btn-edit" onclick="editPost('${key}', '${car.title}', '${car.price}', '${car.status}', '${car.img}')" style="flex:1; background:#f59e0b; color:white; border:none; padding:8px; border-radius:5px; cursor:pointer;">แก้ไข</button>
                                    <button class="btn-del" onclick="deletePost('${key}')" style="flex:1; background:#ef4444; color:white; border:none; padding:8px; border-radius:5px; cursor:pointer;">ลบ</button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
                list.innerHTML += card;
            });
        } else {
            list.innerHTML = "<p style='text-align:center; color:#999;'>ยังไม่มีข้อมูลรถในขณะนี้</p>";
        }
    });
}

// ฟังก์ชันเตรียมแก้ไข
function editPost(key, title, price, status, img) {
    editMode = true;
    editKey = key;
    existingImgUrl = img;
    
    document.getElementById('carTitle').value = title;
    document.getElementById('carPrice').value = price;
    document.getElementById('carStatus').value = status;
    document.getElementById('uploadBtn').innerText = "บันทึกการแก้ไข";
    document.getElementById('cancelEditBtn').style.display = 'block';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ฟังก์ชันลบข้อมูล
function deletePost(id) {
    if (confirm("ยืนยันว่าจะลบข้อมูลรถคันนี้? (ไม่สามารถย้อนกลับได้)")) {
        db.ref(`cars/${id}`).remove()
            .then(() => alert("ลบข้อมูลสำเร็จ"))
            .catch(err => alert("ลบไม่สำเร็จ: " + err.message));
    }
}

// เริ่มต้นทำงานครั้งแรก
renderCars();
