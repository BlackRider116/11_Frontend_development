// const baseUrl = 'https://backend-09-server.herokuapp.com';
const baseUrl = 'http://localhost:9999';

let firstSeenId = 0;
let lastSeenId = 0;

let lastPosts = [];

const rootEl = document.getElementById('root');

const addFormEl = document.createElement('form');
addFormEl.innerHTML = `
<form>
  <div class="form-row">
    <div class="col-5">
    <input class="form-control" placeholder="Введите текст" data-id="link">
    </div>
    <input type="hidden" name="type">
    <input type="hidden" name="url">
    <input data-id="files" type="file" name="media">
    <button data-id="record" class="btn btn-light"> 🔴 </button>
    <button data-id="send" class="btn btn-primary">Добавить</button>
  </div>
</form>
`;
rootEl.appendChild(addFormEl);//🎤 🔴 light

const newPostsBtn = document.createElement('button');
newPostsBtn.className = 'btn btn-primary btn-block mt-1';
newPostsBtn.textContent = 'Показать новые записи';
newPostsBtn.style.display = "none";
newPostsBtn.addEventListener('click', (ev) => {
    fetch(`${baseUrl}/posts/${firstSeenId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(response.statusText);
            }
            return response.json();
        }).then(function (data) {
            firstSeenId = 0;
            lastPosts.unshift(...data.reverse());
            rebuildList(postsEl, lastPosts);
            newPostsBtn.style.display = "none";
        }).catch(error => {
            console.log(error);
        });

});
rootEl.appendChild(newPostsBtn);


const sendEl = document.querySelector('[data-id=send]');
const linkEl = addFormEl.querySelector('[data-id=link]');
linkEl.value = localStorage.getItem('content');
linkEl.addEventListener('input', (evt) => {
    localStorage.setItem('content', evt.currentTarget.value);
});

const typeEl = document.querySelector('input[name=type]');
const urlEl = document.querySelector('input[name=url]');
const mediaEl = document.querySelector('input[name=media]');
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
    navigator.mediaDevices.getUserMedia({audio: true, video: true})
        .then(stream => {
            sendEl.disabled = true;
            mediaEl.disabled = true;
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
        // console.log(data)
        linkEl.value = '';
        typeEl.value = '';
        urlEl.value = '';
        mediaEl.value = '';
        mediaEl.disabled = false;
        mediaRec.disabled = false;
        localStorage.clear();
        lastPosts.unshift(data);
        firstSeenId = data.id;
        rebuildList(postsEl, lastPosts);
    }).catch(error => {
        console.log(error)
    });
});


const postsEl = document.createElement('div');
rootEl.appendChild(postsEl);

const startGet = fetch(`${baseUrl}/posts/seenPosts/${lastSeenId}`)
startGet.then(response => {
    if (!response.ok) {
        throw new Error(response.statusText);
    }
    return response.json();
}).then(function (data) {
    if (data.length !== 0) {
        if (data.length < 5) {
            lastPosts.push(...data.reverse());
        } else {
            lastSeenId = data[data.length - 5].id;
            lastPosts.push(...data.reverse());
            lastPostsBtn.style.display = "block";
        }
        rebuildList(postsEl, lastPosts)
    }
}).catch(error => {
    console.log(error);
});


function rebuildList(containerEl, items) {
    containerEl.innerHTML = '';
    for (const item of items) {
        const postEl = document.createElement('div');
        postEl.className = 'card mb-2';
        if (item.type !== 'image' && item.type !== 'audio' && item.type !== 'video') {
            postEl.innerHTML = `
                <div class="card-body">
                    <div class="card-text">${item.content}</div>
                    <button class="btn">♡ ${item.likes}</button>
                    <button class="btn btn-primary" data-action="like">👍</button>
                    <button class="btn btn-danger" data-action="dislike">👎</button>
                    <button class="btn btn-light" data-action="delete">Удалить пост</button>
                </div>
            `;
        } else if (item.type === 'image') {
            postEl.innerHTML = `
                <img src="${item.file}" class="card-img-top"></img>
                <div class="card-body">
                    <p style='font-size:20px'>${item.content}</p>
                    <button class="btn">♡ ${item.likes}</button>
                    <button class="btn btn-primary" data-action="like">👍</button>
                    <button class="btn btn-danger" data-action="dislike">👎</button>
                    <button class="btn btn-light" data-action="delete">Удалить пост</button>
                </div>
            `;
        } else if (item.type === 'audio') {
            postEl.innerHTML = `
                <audio src="${item.file}" class="card-img-top" controls></audio>
                <div class="card-body">
                    <p style='font-size:20px'>${item.content}</p>
                    <button class="btn">♡ ${item.likes}</button>
                    <button class="btn btn-primary" data-action="like">👍</button>
                    <button class="btn btn-danger" data-action="dislike">👎</button>
                    <button class="btn btn-light" data-action="delete">Удалить пост</button>
                </div>
            `;
        } else if (item.type === 'video') {
            postEl.innerHTML = `
                <video src="${item.file}" class="card-img-top" controls></video>
                <div class="card-body">
                    <p style='font-size:20px'>${item.content}</p>
                    <button class="btn">♡ ${item.likes}</button>
                    <button class="btn btn-primary" data-action="like">👍</button>
                    <button class="btn btn-danger" data-action="dislike">👎</button>
                    <button class="btn btn-light" data-action="delete">Удалить пост</button>
                </div>
            `;
        };

        postEl.querySelector('[data-action=delete]').addEventListener('click', function () {
            fetch(`${baseUrl}/posts/${item.id}`, {
                method: 'DELETE',
            }).then(response => {
                if (!response.ok) {
                    throw new Error(response.statusText);
                }
                return response.json();
            }).then(data => {
                const index = lastPosts.findIndex((post) => {
                    return post.id === item.id
                })
                lastPosts.splice(index, 1)
                rebuildList(postsEl, lastPosts);
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
                const index = lastPosts.findIndex((post) => {
                    return post.id === item.id
                })
                lastPosts[index].likes++;
                rebuildList(postsEl, lastPosts);
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
                const index = lastPosts.findIndex((post) => {
                    return post.id === item.id
                })
                lastPosts[index].likes--;
                rebuildList(postsEl, lastPosts);
            }).catch(error => {
                console.log(error)
            });
        });
        containerEl.appendChild(postEl);
    }
};


const lastPostsBtn = document.createElement('button');
lastPostsBtn.className = 'btn btn-primary btn-block mt-1';
lastPostsBtn.textContent = 'Показать еще посты';
lastPostsBtn.style.display = "none";
lastPostsBtn.addEventListener('click', function () {
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
                    lastPosts.push(...data.reverse());
                    lastPostsBtn.style.display = "none";
                } else {
                    lastSeenId = data[data.length - 5].id;
                    lastPosts.push(...data.reverse());
                    lastPostsBtn.style.display = "block";

                }
                rebuildList(postsEl, lastPosts);
            }
        }).catch(error => {
            console.log(error);
        });
})
rootEl.appendChild(lastPostsBtn);


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