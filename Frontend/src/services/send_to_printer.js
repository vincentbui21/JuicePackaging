

function printImage(url) {
    const win = window.open('', '_blank', 'width=400,height=400');
    const doc = win.document;

    const img = doc.createElement('img');
    img.src = url;
    img.style = 'max-width:100%; max-height:100%;';

    const style = doc.createElement('style');
    style.textContent = `
        body {
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }
    `;

    doc.head.appendChild(style);
    doc.body.appendChild(img);

    img.onload = () => {
        win.print();
        win.close();
    };
}


export default printImage