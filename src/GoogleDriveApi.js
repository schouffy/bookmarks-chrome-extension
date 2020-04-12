import GoogleDriveApiCredentials from "./GoogleDriveApiCredentials.js";
/*global gapi*/
/*global $*/

class GoogleDriveApi {

  constructor() {
    this.GoogleAuth = null;
    this.SCOPE = 'https://www.googleapis.com/auth/drive';
  }

  handleClientLoad = () => {
    // Load the API's client and auth2 modules.
    // Call the initClient function after the modules load.
    gapi.load('client:auth2', this.initClient);
  }

  initClient = () =>  {
    // Retrieve the discovery document for version 3 of Google Drive API.
    // In practice, your app can retrieve one or more discovery documents.
    var discoveryUrl = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

    // Initialize the gapi.client object, which app uses to make API requests.
    // Get API key and client ID from API Console.
    // 'scope' field specifies space-delimited list of access scopes.
    gapi.client.init({
        'apiKey': GoogleDriveApiCredentials.ApiKey,
        'clientId': GoogleDriveApiCredentials.Clientid,
        'discoveryDocs': [discoveryUrl],
        'scope': this.SCOPE
    }).then(() => {
      this.GoogleAuth = gapi.auth2.getAuthInstance();

      // Listen for sign-in state changes.
      this.GoogleAuth.isSignedIn.listen(this.updateSigninStatus);

      // Handle initial sign-in state. (Determine if user is already signed in.)
      var user = this.GoogleAuth.currentUser.get();
      this.setSigninStatus();

    });
  }

  handleAuthClick = () =>  {
    if (this.GoogleAuth.isSignedIn.get()) {
      // User is authorized and has clicked "Sign out" button.
      this.GoogleAuth.signOut();
    } else {
      // User is not signed in. Start Google auth flow.
      this.GoogleAuth.signIn();
    }
  }

  revokeAccess = () =>  {
    this.GoogleAuth.disconnect();
  }

  setSigninStatus = (isSignedIn) => {
    var user = this.GoogleAuth.currentUser.get();
    var isAuthorized = user.hasGrantedScopes(this.SCOPE);
    if (isAuthorized) {
      $('#sign-in-or-out-button').html('Sign out');
      $('#revoke-access-button').css('display', 'inline-block');
      $('#auth-status').html('You are currently signed in and have granted ' +
          'access to this app.');
    } else {
      $('#sign-in-or-out-button').html('Sign In/Authorize');
      $('#revoke-access-button').css('display', 'none');
      $('#auth-status').html('You have not authorized this app or you are ' +
          'signed out.');
    }
  }

  updateSigninStatus = (isSignedIn) => {
    this.setSigninStatus();
  }

  pushSync = () => {
    console.log("push sync");
    // open drive api
    // create folder in root if not exists

    this.getBookmarksFolder()
      .then(folderId => this.createBookmarksFile(folderId));
    // create file in this folder if not exists
    // write something in this file
  }

  pullSync = () => {
    console.log("pull sync");
    // listFiles();

    // console.log(chrome.bookmarks.export());
    // open drive api
    // open file in folder if exists
    // output content of file to console
  }

  listFiles = () => {
    gapi.client.drive.files.list({
      'pageSize': 10,
      'fields': "nextPageToken, files(id, name)"
    }).then((response) => {
      console.log('Files:');
      var files = response.result.files;
      if (files && files.length > 0) {
        for (var i = 0; i < files.length; i++) {
          var file = files[i];
          console.log(file.name + ' (' + file.id + ')');
        }
      } else {
        console.log('No files found.');
      }
    });
  }

  getBookmarksFolder = () => {
    console.log("Bookmark folder exists ?");
    return new Promise((resolve, reject) => {
      gapi.client.drive.files.list({
        'pageSize': 10,
        'fields': "nextPageToken, files(id, name)",
        'q': "'root' in parents and name='bookmarks' and trashed=false"
      }).then((response) => {
        console.log(response);
        if (response.result && response.result.files && response.result.files.length > 0)
          resolve(response.result.files[0].id);
        else {
          this.createBookmarksFolder()
            .then(folderId => resolve(folderId));
        }
      });
    });
  }

  createBookmarksFolder = () => {
    console.log("Create bookmarks folder");
    return new Promise((resolve, reject) => {
      var fileMetadata = {
        'name': 'bookmarks',
        'mimeType': 'application/vnd.google-apps.folder'
      };
      gapi.client.drive.files.create({
        resource: fileMetadata,
        fields: 'id'
      }).then((response) => {
        console.log(response);
        if (response.status !== 200) {
          reject(new Error(response));
        } else {
          resolve(response.result.id);
        }
      });
    });
  }

  createBookmarksFile = (folderId) => {
    console.log("Create bookmarks file in folder " + folderId);

    return new Promise((resolve, reject) => {
      this.createFile('bookmarks.html', 'text/html', folderId, "toto")
        .then(fileId => {
          this.clearPreviousBookmarksFiles(folderId, fileId)
              .then(_ => resolve(fileId));
      })
    });
  }

  createFile = (name, contentType, parentId, data) => {
    return new Promise((resolve, reject) => {
      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";

      var metadata = {
        'name': name,
        'mimeType': contentType,
        'parents': [parentId]
      };

      var multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: ' + contentType + '\r\n\r\n' +
        data +
        close_delim;

      gapi.client.request({
        'path': '/upload/drive/v3/files',
        'method': 'POST',
        'params': {'uploadType': 'multipart'},
        'headers': {
          'Content-Type': 'multipart/related; boundary="' + boundary + '"'
        },
        'body': multipartRequestBody})
        .then(response => {
          console.log(response);
          if (response.status !== 200) {
            reject(new Error(response));
          } else {
            resolve(response.result.id);
          }
        });
    });
  }

  clearPreviousBookmarksFiles = (folderId, currentBookmarkFileid) => {
    console.log("Clear bookmark files in folder " + folderId + " except " + currentBookmarkFileid);
    return new Promise((resolve, reject) => {
      gapi.client.drive.files.list({
        'pageSize': 100,
        'fields': "nextPageToken, files(id)",
        'q': "'" + folderId + "' in parents and trashed=false and name='bookmarks.html'"
      })
      .then(response => {
        if (response.result && response.result.files && response.result.files.length > 0) {
          for (let i = 0; i < response.result.files.length; ++i) {
            if (response.result.files[i].id !== currentBookmarkFileid)
            gapi.client.drive.files.delete({ 'fileId': response.result.files[i].id }).execute();
          }
        }
        resolve();
      });
    });
  }
}

export default GoogleDriveApi;
