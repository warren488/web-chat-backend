$("#friend-form").submit(e => {
    let username = e.target.username.value
    if (!isTrueString(username)) {
        alert('specify username to add')
        return false
    }
    $.ajax({
        type: "POST",
        url: '/api/users/me/friends',
        data: JSON.stringify({
            username: username
        }),
        headers: {
            'Content-type': 'application/json',
            'x-auth': getToken()
        },
        success: () => alert('friend successfully added'),
        error: function(err) {
            console.log(err);
            alert('error adding friend')
        },
        json: true
    });
    return false
})

function startChat(e) {
    var friendship_id = $(e).attr('id')

    $.ajax({
        type: "POST",
        url: '/api/users/me/chat',
        data: JSON.stringify({
            friendship_id: friendship_id
        }),
        headers: {
            'Content-type': 'application/json',
            'x-auth': getToken()
        },
        success: (data) => {
            window.location.href = data.redirect
        },
        error: console.log,
        json: true
    });
    return false
}

// open menu
$("#menu-button").click(e => {
    // console.log('clicked');

    e.preventDefault();
    // sidebar to be opened
    document.getElementById('side').classList.add('shown-for-mobile')
})

$("#close").click(e => {
    document.getElementById('side').classList.remove('shown-for-mobile')
})