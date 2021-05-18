import React, { Component } from "react";
import { List, Avatar, Button, Checkbox, Spin } from "antd";
import satellite from "../assets/images/satellite.svg";

class SatelliteList extends Component {
  state = {
    selected: [],
    isLoad: false,
  };

  render() {
    const satList = this.props.satInfo ? this.props.satInfo.above : [];
    const { isLoad } = this.props;
    const { selected } = this.state;

    return (
      <div className="sat-list-box">
        <div className="btn-container">
          <Button
            className="sat-list-btn"
            type="primary"
            size="large"
            disabled={selected.length === 0}
            onClick={this.onShowSatMap}
          >
            Track on the map
          </Button>
        </div>
        <hr />

        {/* Conditional Rendering: render a spin if we are still laoding. */}
        {isLoad ? (
          <div className="spin-box">
            <Spin tip="Loading..." size="large" />
          </div>
        ) : (
          <List
            className="sat-list"
            itemLayout="horizontal"
            size="small"
            dataSource={satList}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Checkbox dataInfo={item} onChange={this.onChange} />,
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar size={50} src={satellite} />}
                  title={<p>{item.satname}</p>}
                  description={`Launch Date: ${item.launchDate}`}
                />
              </List.Item>
            )}
          />
        )}
      </div>
    );
  }

  // 目前的设计里，卫星被选中后，就会一直存在于 state.selected 里，除非取消勾选！如果没有取消勾选的 event 触发，则页面上即使点击了搜索新的
  // 卫星，旧的选中的卫星也一直存在！且搜索新的卫星后，对于 SatelliteList component 而言，只是触发了它的 updating lifecycle，而 updating
  // lifecycle 被触发时，不会重新执行 constructor，而是直接执行 render() 函数。由于 constructor 不会被重新执行，故 SatelliteList 重新
  // render 后，之前选中的卫星也都在 state.selected 保存了。
  onChange = (e) => {
    const { dataInfo, checked } = e.target;
    const { selected } = this.state;
    const list = this.addOrRemove(dataInfo, checked, selected);
    this.setState({ selected: list });
  };

  addOrRemove = (item, checked, list) => {
    const found = list.some((entry) => entry.satid === item.satid); // use some() or indexOf()
    if (checked && !found) {
      list.push(item);
    }

    if (!checked && found) {
      list = list.filter((entry) => {
        return entry.satid !== item.satid;
      });
    }
    return list;
  };

  onShowSatMap = () => {
    this.props.onShowMap(this.state.selected);
  };
}

export default SatelliteList;
