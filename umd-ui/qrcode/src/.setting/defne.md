## 1. Cấu hình sử dụng icon

### icons-public
Các icon được chứa trong thư mục ```public/assets```
Khi build được copy vào ```dist/assets```

### icons-inline
Các icon được chứa trong thư mục ```src/lib/assets```
Khi build thì được nhúng inline trong file css output.

### Ví dụ cấu hình:

```json
{
    "icons-public": [
        {
            "name": "facebook",
            "file": "facebook.png",
            "hover": "facebook-hover.png",
            "size":"12px 14px",
            "position":"center"
        },
        {
            "name": "google",
            "file": "google.png",
            "size":"12px",
            "position":"8px center"
        },
        {
            "name": "apple",
            "file": "apple.png"
        }
    ],
    "icons-inline": [
        {
            "name": "icon-close",
            "file": "close.svg",
            "size":"12px 14px",
            "position":"center"
        }
        
    ]
    
}
```
#### output
File css output được tạo ra trong thư mục ```src/.setting/css``` và tự động import vào chương trình
Ví dụ

```css
.cssprefix-facebook {
    background-image: url(../../../public/assets/facebook.png);
    background-size: 12px 14px;
    background-repeat: no-repeat;
    background-position: center;
}
.cssprefix-facebook:hover {
    background-image: url(../../../public/assets/facebook-hover.png);
}
.cssprefix-google {
    background-image: url(../../../public/assets/google.png);
    background-size: 12px;
    background-repeat: no-repeat;
    background-position: 8px center;
}
.cssprefix-apple {
    background-image: url(../../../public/assets/apple.png);
    background-repeat: no-repeat;
    background-position: center;
}
.cssprefix-icon-close {
    background-image: url(../../assets/icon-close.png);
    background-repeat: no-repeat;
    background-position: center;
}
```

### Khi build mode prod:
- Các file icons-inline được chuyển thành base64 nhúng vào file css luôn.
- Các file icons-public được copy ra thư mục dist/assets
- 


## 2. Cấu hình biến 

```json
{
    "variables":{
        "primary-color": "#2563eb",
        "text-color": "#111827",
        "hint-color": "#e5e5e5",
        "border-color": "#9CA3AF",
        "item-hover-color": "#f2f2f2",
        "font-size": "14px"
    }
}
```

output css

```css
:root {
    --cssprefix-primary-color: #2563eb;
    --cssprefix-text-color: #111827;
    --cssprefix-hint-color: #e5e5e5;
    --cssprefix-border-color: #9CA3AF;
    --cssprefix-item-hover-color: #f2f2f2;
    --cssprefix-font-size: 14px;
}
```