var size = 450;
        var card = {
            Address: "<a>Hà Nội</a>",
            CompanyAddress: "Tầng 9, Tòa nhà Technosoft, số 8 ngõ 15 Duy Tân, Cầu Giấy, Hà Nội",
            FullName: "Nguyen Đức Quảng",
            LastName: "Đức Quảng",
            FirstName: "Nguyễn",
            JobTitle: "Fresher",
            Mobile: "0389926059",
            OfficeTel: "0243 122 222",
            Organization: "MISA JSC",
            Website: "misa.vn",
            OfficeEmail: "ndquang@software.misa.com.vn",
            Email: "ndquang@gmail.com",
            Avatar: "https://api.amis.vn/Handler/ImageHandler.ashx?UserID=9dbbfcc8-05e9-4e44-b47b-b7764f244c3f&CompanyCode=misajsc&H=192&W=192"
        };

 
        var body = document.body;



        function renderQR(size, type, level) {


            var el = global.createVCard(card, {
                boxSize: size,
                imageType: type,
                colorDark: "#212121",
                colorLight: "#f0f0f0",
                colorPrimary: "#003499",
                correctLevel: level,
                style: "rect"

            });
            body.append(" QR Client type= " + type + " box-size=" + size + "px" + " level=" + level);
            body.append(el);
        }

        renderQR(size, global.ImageType.SVG, 1);
        renderQR(size, global.ImageType.SVG, 0);
        renderQR(size, global.ImageType.SVG, 3);
        renderQR(size, global.ImageType.SVG, 2);

        var el = global.create("misa", {
            colorDark: "#0238F0",
            celSize: 0,
            boxSize: 270,
            colorPrimary: "#2196f3",
            style: "dot"
        });
        body.append("QR client for text=misa box-size=" + size + "px");
        body.append(el);


        function showBox(card, lang) {
            global.showVCardBox(card, {
                shareLink: "https://cdnapps.amispdc.misa.local/apps/qrviewer/index.html?sz=400&st=dot&ct={0}",
                afterCopyClipboard: function (text) {
                    //show toast thông báo copy success ở đây
                    console.log(text);
                    alert("copy success");
                }

            }, lang);
        }

        showBox(card, "vi");

        let text = global.getVCardString(card);
        body.append(text);