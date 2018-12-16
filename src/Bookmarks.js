/*global chrome*/

class BookmarkData {
  constructor(title, url) {
    this.title = title;
    this.url = url;
    this.id = "fakeId";
  }
}
class BookmarkFolderData {
  constructor(title, children) {
    this.title = title;
    this.children = children;
  }
}

class DataProvider {
  static getBookmarks = callback => {
    if (chrome && chrome.bookmarks) {
      chrome.bookmarks.getTree(function(bookmarks) {
        // Move "other favorites" to "favorites bar" for better displaying
        bookmarks[0].children[0].children.push(bookmarks[0].children[1]);
        // Return "favorites bar" as the root node
        callback(bookmarks[0].children[0].children);
      });
      return;
    }

    callback([
      new BookmarkFolderData("Folder 1", [
        new BookmarkData("Bookmark 1", "https://www.google.fr"),
        new BookmarkFolderData("Bookmark 2", [
          new BookmarkData("Bookmark 21", "https://www.google.fr")
        ])
      ]),
      new BookmarkFolderData("Folder 2", [
        new BookmarkData("Bookmark 1", "https://www.google.fr")
      ]),
      new BookmarkData("Bookmark 1", "https://www.google.fr"),
      new BookmarkData("Bookmark 2", "https://www.google.fr"),
      new BookmarkData("Bookmark 3", "https://www.google.fr"),
      new BookmarkData("Bookmark 4 with a very long title that will most likely require a second line to render", "https://www.google.fr"),
      new BookmarkData("Bookmark 5", "https://www.google.fr")
    ]);
  };

  static searchBookmarks = (filter, callback) => {
    if (chrome && chrome.bookmarks) {
      chrome.bookmarks.search(filter, function(bookmarks) {
        callback(bookmarks);
      });
      return;
    }

    callback([
      // new BookmarkData("Filtered result 1", "https://www.google.fr"),
      // new BookmarkData("Filtered result 2", "https://www.google.fr")
    ]);
  };
}

export default DataProvider;
