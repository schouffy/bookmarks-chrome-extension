/*global chrome*/

import React, { Component } from "react";
import folder from "./folder.svg";
import "./App.css";
import GoogleDriveApi from "./GoogleDriveApi.js";
import DataProvider from "./Bookmarks.js";
import {DebounceInput} from 'react-debounce-input';
import Highlighter from "react-highlight-words";

class Bookmark extends React.Component {
  constructor(props) {
    super(props);
    this.state = { removeMouseOver: false, removeClicked: false, removed: false };
  }

  openUrl = e => {
    console.log("open url");
    if (chrome && chrome.tabs) {
      if (e.ctrlKey) {
        chrome.tabs.create({ url: this.props.url, active: false });
      } else if (e.shiftKey) {
        chrome.windows.create({
          url: this.props.url
        });
      } else {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
          var tab = tabs[0];
          chrome.tabs.update(tab.id, { url: this.props.url });
        });
        window.close();
      }
    }
  };

  removeBookmark = (e) => {
    e.stopPropagation();
    if (this.state.removeClicked) {
      if (chrome && chrome.tabs) {
        chrome.bookmarks.remove(this.props.id, () => {
          this.setState({ removed: true });
        });
      }
      else {
        console.log("removed");
        this.setState({ removed: true });
      }
    }
    else {
      this.setState({ removeClicked: true });
    }
  }

  mouseOverDelete = (e) => {
    this.setState({ removeMouseOver: true, removeClicked: false });
  }
  mouseOutDelete = (e) => {
    this.setState({ removeMouseOver: false, removeClicked: false });
  }

  sanitize = (text) => {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
  }

  render() {
    let iconUrl = this.props.parentCollapsed
      ? ""
      : "chrome://favicon/" + this.props.url;
    let searchTerms = this.props.searchQuery.split(" ");
    let tooltip = this.props.title + "\n" + this.props.url;
    let bookmarkRemoveClassName = "";
    if (this.state.removeMouseOver && !this.state.removeClicked)
      bookmarkRemoveClassName = " bookmark-remove-hover";
    else if (this.state.removeClicked)
      bookmarkRemoveClassName = " bookmark-remove-clicked";
    return (
      <li onClick={this.openUrl} title={tooltip} className={this.state.removed ? "hidden" : ""}>
        <img src={iconUrl} />
        <Highlighter
          highlightClassName="mark"
          searchWords={searchTerms}
          autoEscape={true}
          sanitize={this.sanitize}
          textToHighlight={this.props.title}
        />
        <div className={ "bookmark-remove" + bookmarkRemoveClassName }>
          <div className="bookmark-remove-prompt">Remove</div>
          <div className="bookmark-remove-confirm">Are you sure?</div>
          <div className={ "bookmark-remove-icon" + bookmarkRemoveClassName } onMouseOver={this.mouseOverDelete} onMouseOut={this.mouseOutDelete} onClick={this.removeBookmark}></div>
        </div>
      </li>
    );
  }
}

class BookmarkFolder extends React.Component {
  constructor(props) {
    super(props);
    this.state = { collapsed: this.props.collapsed };
  }

  toggle = () => {
    this.setState(state => ({
      collapsed: !state.collapsed
    }));
  };

  render() {
    let list = [];
    let bookmarks = this.props.children || [];
    for (let i = 0; i < bookmarks.length; ++i) {
      let b = bookmarks[i];
      if (b.children)
        list.push(
          <BookmarkFolder
            key={i}
            title={b.title}
            children={b.children}
            collapsed={true}
            searchQuery={this.props.searchQuery}
          />
        );
      else
        list.push(
          <Bookmark
            key={i}
            id={b.id}
            title={b.title}
            url={b.url}
            parentCollapsed={this.state.collapsed}
            searchQuery={this.props.searchQuery}
          />
        );
    }
    return (
      <div>
        <div
          className="folder"
          style={{ display: this.props.title ? "block" : "none" }}
          onClick={this.toggle}
        >
          <img src={folder} />
          <span>{this.props.title}</span>
        </div>
        <ul className={this.state.collapsed ? "collapsed" : "expanded"}>
          {list}
        </ul>
      </div>
    );
  }
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = { bookmarks: [], filter: "", empty: false };
    this.googleDriveApi = new GoogleDriveApi();
  }

  componentDidMount = () => {
    this.loadAllBookmarks();
    this.googleDriveApi.handleClientLoad();
  };

  loadAllBookmarks = () => {
    DataProvider.getBookmarks(bookmarks => {
      this.setState({ bookmarks: bookmarks, empty: bookmarks.length === 0 });
    });
  };

  handleFilterChange = event => {
    this.setState({ filter: event.target.value });

    if (event.target.value.length > 0)
      DataProvider.searchBookmarks(event.target.value, bookmarks => {
        this.setState({ bookmarks: bookmarks, empty: bookmarks.length === 0 });
      });
    else
      this.loadAllBookmarks();
  };

  openBookmarksManager = (e) => {
    console.log("open manager");
    let bookmarksManagerUrl = "chrome://bookmarks";
    if (chrome && chrome.tabs) {
      if (e.ctrlKey) {
        chrome.tabs.create({ url: bookmarksManagerUrl, active: false });
      } else if (e.shiftKey) {
        chrome.windows.create({
          url: bookmarksManagerUrl
        });
      } else {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
          var tab = tabs[0];
          chrome.tabs.update(tab.id, { url: bookmarksManagerUrl });
        });
        window.close();
      }
    }
  }

  onKeyDown = (e) => {
    
    // up/down : find the currently focused item and go up/down
    // enter: open the currently focused item (or expand/collapse if folder) + ctrl/maj variants

    // https://stackoverflow.com/questions/42036865/react-how-to-navigate-through-list-by-arrow-keys
    
  }

  signIn = () => {
    this.googleDriveApi.handleAuthClick();
  }
  pullSync = () => {
    this.googleDriveApi.pullSync();
  }
  pushSync = () => {
    this.googleDriveApi.pushSync();
  }
  revokeAccess = () => {
    this.googleDriveApi.revokeAccess();
  }

  render() {
    return (
      <div className="App">
        <div className="search">
          <DebounceInput
            minLength={1}
            debounceTimeout={200}
            onChange={this.handleFilterChange}
            autoFocus={true} />
        </div>
        <div className="empty" style={{ display: this.state.empty ? 'block' : 'none'}}>🤷‍♂️</div>
        <BookmarkFolder children={this.state.bookmarks} collapsed={false} searchQuery={this.state.filter} />
        <div className="command-bar">
          {/* <button onClick={this.openBookmarksManager}>Open bookmark manager</button> */}

          <button id="sign-in-or-out-button" onClick={this.signIn}>Sign In/Authorize</button>
          <button onClick={this.pushSync}>push sync</button>
          <button onClick={this.pullSync}>pull sync</button>
          <button id="revoke-access-button"
            onClick={this.revokeAccess}>Revoke access</button>
    
          <div id="auth-status" style={{"display": "inline", "paddingLeft": "25px"}}></div>
        </div>
      </div>
    );
  }
}

export default App;
