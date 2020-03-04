const baseUrl = 'https://backend-dz11.herokuapp.com';
// const baseUrl = 'http://localhost:9999';

let firstSeenId = 0;
let lastSeenId = 0;

const rootEl = document.getElementById('root');

const addFormEl = document.createElement('form');
addFormEl.innerHTML = `
<div class="input-group">
  <input type="text" class="form-control" placeholder="Введите текст" data-id="link">
  <div class="input-group-append" id="button-addon4">
    <input type="hidden" name="type">
    <input type="hidden" name="url">
    <input data-id="files" type="file" name="media" style="visibility: hidden; opacity: 0.0001; height: 1px; width: 1px;">
    <button data-action="upload" class="btn btn-outline-secondary" type="button">Загрузить</button>
    <button data-id="record" class="btn btn-outline-secondary" type="button">Записать</button>
    <button data-id="send" class="btn btn-outline-primary" type="button">Добавить</button>
  </div>
</div>
`;
rootEl.appendChild(addFormEl);//🎤 🔴 light

// функция показа новых записей
const newPostsBtn = document.createElement('button');
newPostsBtn.className = 'btn btn-primary btn-block mt-1';
newPostsBtn.textContent = 'Показать новые записи';
newPostsBtn.style.display = "none";
newPostsBtn.addEventListener('click', (ev) => {
    ev.preventDefault();
    fetch(`${baseUrl}/posts/${firstSeenId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(response.statusText);
            }
            return response.json();
        }).then(function (data) {
            firstSeenId = 0;
            rebuildList(postsEl, data, 1);
            newPostsBtn.style.display = "none";
        }).catch(error => {
            console.log(error);
        });

});
rootEl.appendChild(newPostsBtn);

// поле ввода текста
const sendEl = document.querySelector('[data-id=send]');
const linkEl = addFormEl.querySelector('[data-id=link]');
linkEl.value = localStorage.getItem('content');
linkEl.addEventListener('input', (evt) => {
    localStorage.setItem('content', evt.currentTarget.value);
});

// загрузка медиа
const uploadEl = document.querySelector('[data-action=upload]');
const typeEl = document.querySelector('input[name=type]');
const urlEl = document.querySelector('input[name=url]');
const mediaEl = document.querySelector('[data-id=files]');
uploadEl.addEventListener('click', evt => {
    mediaEl.dispatchEvent(new MouseEvent('click'));
});
mediaEl.addEventListener('change', ev => {
    ev.preventDefault();
    mediaRec.disabled = true;
    const [first] = Array.from(ev.currentTarget.files);
    const formData = new FormData();
    formData.append('media', first);
    sendEl.disabled = true;
    fetch(`${baseUrl}/upload`, {
        method: 'POST',
        body: formData,
    }).then(resp => {
        if (!resp.ok) {
            throw new Error(resp.statusText);
        }
        return resp.json();
    }).then(data => {
        const fileUrl = `${baseUrl}/static/${data.name}`;
        urlEl.value = fileUrl;
        typeEl.value = data.types;
    }).catch(e => {
        console.log(e);
    }).finally(() => {
        sendEl.disabled = false;
    });
});

// кнопка записи
const mediaRec = addFormEl.querySelector('[data-id=record]');
mediaRec.addEventListener('click', function (ev) {
    ev.preventDefault();
    if (!navigator.mediaDevices) {
        const alertEl = document.createElement('div');
        alertEl.textContent = 'Your browser not support media! Use Yande Browser.';
        document.body.appendChild(alertEl);
        return;
    }
    if (!window.MediaRecorder) {
        const alertEl = document.createElement('div');
        alertEl.textContent = 'Your browser not media recordering! Use Yande Browser.';
        document.body.appendChild(alertEl);
        return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        .then(stream => {
            sendEl.disabled = true;
            uploadEl.disabled = true;
            const mediaRecorder = new MediaRecorder(stream, {
                mediaType: 'video/webm',
            });
            const blobParts = [];

            mediaRecorder.addEventListener('dataavailable', ev => {
                blobParts.push(ev.data);
            });

            mediaRecorder.addEventListener('stop', ev => {
                stream.getTracks().forEach(o => o.stop());
                const blob = new Blob(blobParts);
                const formData = new FormData();
                formData.append('media', blob);

                fetch(`${baseUrl}/upload`, {
                    method: 'POST',
                    body: formData,
                }).then(resp => {
                    if (!resp.ok) {
                        throw new Error(resp.statusText);
                    }
                    return resp.json();
                }).then(data => {
                    const fileUrl = `${baseUrl}/static/${data.name}`;
                    urlEl.value = fileUrl;
                    typeEl.value = data.types;
                    sendEl.disabled = false;
                }).catch(e => {
                    console.log(e);
                });
            });
            mediaRecorder.start();
            setTimeout(() => {
                mediaRecorder.stop();
            }, 10000);

        }).catch(e => {
            console.log(e);
        });
})


// кнопка добавить пост
addFormEl.querySelector('[data-id=send]').addEventListener('click', function (ev) {
    ev.preventDefault();
    const post = {
        id: 0,
        content: linkEl.value,
        type: typeEl.value,
        file: urlEl.value,
    }
    fetch(`${baseUrl}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post)
    }).then(response => {
        if (!response.ok) {
            throw new Error(response.statusText);
        }
        return response.json();
    }).then(data => {
        linkEl.value = '';
        typeEl.value = '';
        urlEl.value = '';
        mediaEl.value = '';
        uploadEl.disabled = false;
        mediaRec.disabled = false;
        localStorage.clear();
        firstSeenId = data.id;

        rebuildList(postsEl, Array(data), 1);
    }).catch(error => {
        console.log(error)
    });
});


const postsEl = document.createElement('div');
rootEl.appendChild(postsEl);

// первичный GET запрос (отобразить 5 постов)
const startGet = fetch(`${baseUrl}/posts/seenPosts/${lastSeenId}`)
startGet.then(response => {
    if (!response.ok) {
        throw new Error(response.statusText);
    }
    return response.json();
}).then(function (data) {
    if (data.length !== 0) {
        if (data.length >= 5) {
            lastSeenId = data[data.length - 5].id;
            lastPostsBtn.style.display = "block";
        }
        rebuildList(postsEl, data.reverse())
    }
}).catch(error => {
    console.log(error);
});

// определяет тип поста
function returnPost(post) {
    if (post.type === '') {
        return `
        <div class="card-body">
            <p style='font-size:20px'>${post.content}</p>
            <button class="btn" data-id="likes">♡ ${post.likes}</button>
            <button class="btn btn-primary" data-action="like">👍</button>
            <button class="btn btn-danger" data-action="dislike">👎</button>
            <button class="btn btn-light" data-action="delete">Удалить пост</button>
            
        </div>
    `;
    } else if (post.type === 'image') {
        return `
        <img src="${post.file}" class="card-img-top"></img>
        <div class="card-body">
            <p style='font-size:20px'>${post.content}</p>
            <button class="btn" data-id="likes">♡ ${post.likes}</button>
            <button class="btn btn-primary" data-action="like">👍</button>
            <button class="btn btn-danger" data-action="dislike">👎</button>
            <button class="btn btn-light" data-action="delete">Удалить пост</button>
            
        </div>
    `;
    } else if (post.type === 'audio') {
        return `
        <audio src="${post.file}" class="card-img-top" controls></audio>
        <div class="card-body">
            <p style='font-size:20px'>${post.content}</p>
            <button class="btn" data-id="likes">♡ ${post.likes}</button>
            <button class="btn btn-primary" data-action="like">👍</button>
            <button class="btn btn-danger" data-action="dislike">👎</button>
            <button class="btn btn-light" data-action="delete">Удалить пост</button>
            
        </div>
    `;
    } else if (post.type === 'video') {
        return `
        <video src="${post.file}" width="960" height="540" class="embed-responsive embed-responsive-16by9 card-img-top" controls></video>
        <div class="card-body">
            <p style='font-size:20px'>${post.content}</p>
            <button class="btn" data-id="likes">♡ ${post.likes}</button>
            <button class="btn btn-primary" data-action="like">👍</button>
            <button class="btn btn-danger" data-action="dislike">👎</button>
            <button class="btn btn-light" data-action="delete">Удалить пост</button>
            
        </div>
    `;
    };
}


// рисует посты
function rebuildList(containerEl, items, arrangement) {
    for (let item of items) {
        const postEl = document.createElement('li');
        postEl.className = 'card mb-2';
        postEl.innerHTML = returnPost(item)

        postEl.querySelector('[data-action=delete]').addEventListener('click', function () {
            fetch(`${baseUrl}/posts/${item.id}`, {
                method: 'DELETE',
            }).then(response => {
                if (!response.ok) {
                    throw new Error(response.statusText);
                }
                return response.json();
            }).then(data => {
                containerEl.removeChild(postEl);
            }).catch(error => {
                console.log(error)
            });
        });

        postEl.querySelector('[data-action=like]').addEventListener('click', function (ev) {
            ev.preventDefault();
            fetch(`${baseUrl}/posts/${item.id}/likes`, {
                method: 'POST',
            }).then(response => {
                if (!response.ok) {
                    throw new Error(response.statusText);
                }
                return response.json();
            }).then(data => {
                postEl.querySelector('[data-id=likes]').textContent =`♡ ${data.likes}`
            }).catch(error => {
                console.log(error)
            });
        });

        postEl.querySelector('[data-action=dislike]').addEventListener('click', function (ev) {
            ev.preventDefault();
            fetch(`${baseUrl}/posts/${item.id}/likes`, {
                method: 'DELETE',
            }).then(response => {
                if (!response.ok) {
                    throw new Error(response.statusText);
                }
                return response.json();
            }).then(data => {
                postEl.querySelector('[data-id=likes]').textContent =`♡ ${data.likes}`
            }).catch(error => {
                console.log(error)
            });
        });
        if (arrangement === 1) {
            containerEl.insertBefore(postEl, containerEl.firstElementChild);
        } else {
            containerEl.appendChild(postEl)
        }
    }
};


//кнопка "Показать еще посты"
const lastPostsBtn = document.createElement('button');
lastPostsBtn.className = 'btn btn-primary btn-block mt-1';
lastPostsBtn.textContent = 'Показать еще посты';
lastPostsBtn.style.display = "none";
lastPostsBtn.addEventListener('click', function (ev) {
    ev.preventDefault();
    fetch(`${baseUrl}/posts/seenPosts/${lastSeenId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(response.statusText);
            }
            return response.json();
        }).then(function (data) {
            if (data.length === 0) {
                lastPostsBtn.style.display = "none";
            }
            else {
                if (data.length < 5) {
                    lastSeenId = data[data.length - 1].id;
                    lastPostsBtn.style.display = "none";
                } else {
                    lastSeenId = data[data.length - 5].id;
                    lastPostsBtn.style.display = "block";
                }
                rebuildList(postsEl, data.reverse());
            }
        }).catch(error => {
            console.log(error);
        });
})
rootEl.appendChild(lastPostsBtn);

//проверка на наличие новых постов
setInterval(() => {
    const promise = fetch(`${baseUrl}/posts/${firstSeenId}`)
    promise.then(response => {
        if (!response.ok) {
            throw new Error(response.statusText);
        }
        return response.json();
    }).then(function (data) {
        if (data.length === 0) {
            console.log('Новых постов нет');
            newPostsBtn.style.display = "none";
        }
        else {
            if (firstSeenId === 0) {
                firstSeenId = data[data.length - 1].id;
                newPostsBtn.style.display = "none";
            } else {
                newPostsBtn.style.display = "block";
            }
        }
    }).catch(error => {
        console.log(error);
    });
}, 3000);