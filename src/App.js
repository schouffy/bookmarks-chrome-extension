/*global chrome*/

import React, { Component } from "react";
import folder from "./folder.svg";
import "./App.css";
import DataProvider from "./Bookmarks.js";
import {DebounceInput} from 'react-debounce-input';
import Highlighter from "react-highlight-words";

class Bookmark extends React.Component {
  constructor(props) {
    super(props);
    this.state = { removeClicked: false, removed: false };
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
    console.log("remove bookmarl");
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

  sanitize = (text) => {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
  }

  render() {
    let iconUrl = this.props.parentCollapsed
      ? ""
      : "chrome://favicon/" + this.props.url;
    let searchTerms = this.props.searchQuery.split(" ");
    let tooltip = this.props.title + "\n" + this.props.url;
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
        <div className={this.state.removeClicked ? "remove-confirm" : "remove-bookmark"} onClick={this.removeBookmark}></div>
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
  }

  componentDidMount = () => {
    this.loadAllBookmarks();
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
        <div className="empty" style={{ display: this.state.empty ? 'block' : 'none'}}>T_T</div>
        <BookmarkFolder children={this.state.bookmarks} collapsed={false} searchQuery={this.state.filter} />
      </div>
    );
  }
}

export default App;
