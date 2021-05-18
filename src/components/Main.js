import React, { Component } from "react";
import { Row, Col } from "antd";
//import axios from "axios";
import SatSetting from "./SatSetting";
import SatelliteList from "./SatelliteList";
import { NEARBY_SATELLITE, SAT_API_KEY, STARLINK_CATEGORY } from "../constants";
import WorldMap from "./WorldMap";

class Main extends Component {
  state = {
    setting: null, // { latitude, longitude, elevation, altitude } entered in the SatSetting form
    satInfo: null, // satInfo contains all found satellites nearby
    satList: null, // satList contains only the checked satellites
    isLoadingList: false,
  };

  render() {
    // const { satInfo } = this.state;
    const { isLoadingList, satInfo, satList, setting } = this.state;

    return (
      <Row className="main">
        <Col span={8} className="left-side">
          <SatSetting onShow={this.showNearbySatellite} />
          <SatelliteList
            satInfo={satInfo}
            isLoad={isLoadingList}
            onShowMap={this.showMap}
          />
        </Col>
        <Col span={16} className="right-side">
          <WorldMap satData={satList} observerData={setting} />
        </Col>
      </Row>
    );
  }

  showMap = (selected) => {
    // this.setState(preState => ({
    //     ...preState,
    //     isLoadingMap: true,
    //     satList: [...selected],
    // }));

    this.setState((preState) => ({
      ...preState,
      satList: [...selected],
    }));

    console.log("show on the map: ", selected);
  };

  showNearbySatellite = (setting) => {
    // Set isLoadingList = true once we start fetching data, and set isLoadingList = false once we finished fetching. This
    // will show the spining for the entrie period of fetching request.
    this.setState({
      isLoadingList: true,
      setting: setting,
    });

    this.fetchSatellite(setting);
  };

  fetchSatellite = (setting) => {
    const { latitude, longitude, elevation, altitude } = setting;
    const url = `/${NEARBY_SATELLITE}/${latitude}/${longitude}/${elevation}/${altitude}/${STARLINK_CATEGORY}/&apiKey=${SAT_API_KEY}`;

    // this.setState({
    //     isLoadingList: true,
    // });

    // axios
    //     .get(url)
    //     .then(response => {
    //         console.log("axios call: ", response.data);
    //         this.setState({
    //             satInfo: response.data,
    //             isLoadingList: false,
    //         });
    //     })
    //     .catch(error => {
    //         console.log("err in fetch satellite -> ", error);
    //     });

    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        //console.log("fetch call: ", data);
        this.setState({
          satInfo: data,
          isLoadingList: false,
        });
      })
      .catch((error) => {
        console.log("err in fetch satellite -> ", error);
      });
  };
}

export default Main;
