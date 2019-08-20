var messageTemplate = `<li class="{{class}} {{status}}" id='{{id}}'><div class='message pending'> <div class='message__title'>    <h4>{{from}}</h4>    <span>{{createdAt}}</span>    <p class='reply' onclick="replyClick(this)">reply</p>    <!-- <div class="dropdown">            <span>Mouse over me</span>            <div class="dropdown-content">            <p>Hello World!</p>            </div>          </div> --></div><div class="message__body">    <p class="wrap">{{text}}</p> </div></div></li>`;
var messageQuoteTemplate = `<li class="{{class}} {{status}}" id='{{id}}'><div class='message pending'><div class='message__title'>    <h4>{{from}}</h4>    <span>{{createdAt}}</span>    <p class='reply' onclick="replyClick(this)" >reply</p>    <!-- <div class="dropdown">            <span>Mouse over me</span>            <div class="dropdown-content">            <p>Hello World!</p>            </div>          </div> --></div><div class="message__body">    <p class="wrap"> {{text}}</p>    <span class="quoted">        <div class='message__title'>            <h4>{{quotedFrom}}</h4>            <span>{{quotedAt}}</span>        </div>         <p class="wrap">{{quotedMessage}}</p>            </span></div></div></li>`;
// template takes removes the need for manual looping 
var newTemplate = `{{#each messages}}
<li class="{{#equal ../username from 'is' }}{{status}} {{/equal}} {{#equal ../username from 'is' }}me{{/equal}}"
    id='{{_id}}'>
    <div class="message">
        <div class='message__title'>
            <h4>{{#equal ../username from 'is' }}me{{/equal}}{{#equal ../username from 'not' }}{{from}}{{/equal}}
            </h4>
            <span>{{createdAt}}</span>
            <p class='reply' onclick="replyClick(this)">reply</p>
        </div>
        <div class="message__body">
            <p class="wrap">{{text}}</p>
            {{#if quoted}}
            {{#quoted}}
            <span class="quoted">
                <div class='message__title'>
                    <h4>{{#equal ../../username from 'is' }}me{{/equal}}{{#equal ../../username from 'not' }}{{from}}{{/equal}}
                    </h4>
                    <span>{{createdAt}}</span>
                </div>
                <p class="wrap">{{text}}</p>
            </span>
            {{/quoted}}
            {{/if}}
        </div>

    </div>
</li>
{{/each}}`
var friendship_id = window.location.pathname.split("/")[3];

$.ajax({
    type: "GET",
    url: `/api/users/me/${friendship_id}/messages`,
    headers: {
        "Content-type": "application/json",
        "x-auth": getToken()
    },
    success: data => {
        var fullHTML = '';
        for (let i = 0; i < data.length; i++) {
            var message = data[i];
            var messageHTML = parseMessage(message)
            fullHTML += messageHTML
        };
        $("#messages").html(fullHTML)
        scrollBottom();
    },
    error: console.log,
    json: true
});

function parseMessage(data) {
    var template = messageTemplate;
    var templateData = {
        text: data.text,
        from: data.from === getUsername() ? "me" : data.from,
        class: data.from === getUsername() ? "me" : "them",
        createdAt: new Date(data.createdAt).toLocaleTimeString(),
        id: data.msgId,
        status: data.status
    };
    if (data.quoted) {
        templateData.quotedFrom =
            data.quoted.from === getUsername() ? "me" : data.quoted.from;
        templateData.quotedAt = new Date(
            data.quoted.createdAt
        ).toLocaleTimeString();
        templateData.quotedMessage = data.quoted.text;
        template = messageQuoteTemplate;
    }
    return Mustache.render(template, templateData);
}

function parse2(data) {
    return Mustache.render(newTemplate, data);    
}