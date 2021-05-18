import React, { Component } from "react";
import axios from "axios";
import { Spin } from "antd";
import { feature } from "topojson-client";
import { geoKavrayskiy7 } from "d3-geo-projection";
import { geoGraticule, geoPath } from "d3-geo";
import { select as d3Select } from "d3-selection";
import { schemeCategory10 } from "d3-scale-chromatic";
import * as d3Scale from "d3-scale";
import { timeFormat as d3TimeFormat } from "d3-time-format";

import {
  WORLD_MAP_URL,
  SATELLITE_POSITION_URL,
  SAT_API_KEY,
} from "../constants";

const width = 960;
const height = 600;

class WorldMap extends Component {
  constructor() {
    super();
    this.state = {
      isLoading: false,
      isDrawing: false,
    };
    this.map = null;
    this.color = d3Scale.scaleOrdinal(schemeCategory10);
    this.refMap = React.createRef();
    this.refTrack = React.createRef();
  }

  componentDidMount() {
    axios
      .get(WORLD_MAP_URL)
      .then((res) => {
        // get topology data
        const { data } = res;

        // convert topo data to geo data
        const land = feature(data, data.objects.countries).features;

        // generate world map
        this.generateMap(land);
      })
      .catch((e) => {
        console.log("err in fetch map data ", e.message);
      });
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.satData !== this.props.satData) {
      const { latitude, longitude, elevation, duration } =
        this.props.observerData;
      const endTime = duration * 60; // 实际看的时间长度是输入的 duration 的 60 倍，目的是显示出区别

      // 当开始获取卫星的位置信息时，将 isLoading 设置为 true；当所有卫星 position 信息都获取到后， isLoading 设置为 false
      this.setState({
        isLoading: true,
      });

      // 获取每个卫星的 position 信息
      const getPositions = this.props.satData.map((sat) => {
        const { satid } = sat;
        const url = `/api/${SATELLITE_POSITION_URL}/${satid}/${latitude}/${longitude}/${elevation}/${endTime}/&apiKey=${SAT_API_KEY}`;

        return axios.get(url);
      });

      // 当所有卫星的 position 信息都获取到后，isLoading 设置为 false，isDrawing 设置为 ture，然后开始打点画图
      Promise.all(getPositions)
        .then((res) => {
          const arr = res.map((sat) => sat.data);
          console.log("Selected satellites: ", arr);

          this.setState({
            isLoading: false,
            isDrawing: true, // isDrawing == true, we disable the "track on the map" button
          });

          if (!prevState.isDrawing) {
            this.track(arr);
          } else {
            const oHint = document.getElementsByClassName("hint")[0];
            oHint.innerHTML =
              "Please wait for these satellite animation to finish before selection new ones!";
          }
        })
        .catch((e) => {
          console.log("err in fetch satellite position -> ", e.message);
        });
    }
  }

  // track: 画卫星轨迹 (打点画图)
  track = (data) => {
    if (!data[0].hasOwnProperty("positions")) {
      throw new Error("no position data");
    }

    const len = data[0].positions.length;
    // const { duration } = this.props.observerData;

    // get track canvas
    const { context2 } = this.map;

    // record current time
    let now = new Date();
    let i = 0;

    let timer = setInterval(() => {
      let ct = new Date();

      let timePassed = i === 0 ? 0 : ct - now;
      let time = new Date(now.getTime() + 60 * timePassed);

      // 清除 track canvas 上的上一个时间戳
      context2.clearRect(0, 0, width, height);

      context2.font = "bold 14px sans-serif";
      context2.fillStyle = "#333";
      context2.textAlign = "center";
      context2.fillText(d3TimeFormat(time), width / 2, 10);

      if (i >= len) {
        clearInterval(timer);
        this.setState({ isDrawing: false }); // 打完点了
        const oHint = document.getElementsByClassName("hint")[0];
        oHint.innerHTML = "";
        return;
      }

      // 给每个卫星打点画图: 画每个卫星的每个点，故每个卫星得到一条轨迹
      data.forEach((sat) => {
        const { info, positions } = sat;
        this.drawSat(info, positions[i]);
      });

      i += 60;
    }, 1000);
  };

  drawSat = (sat, pos) => {
    const { satlongitude, satlatitude } = pos;

    if (!satlongitude || !satlatitude) return;

    const { satname } = sat;
    const nameWithNumber = satname.match(/\d+/g).join("");

    const { projection, context2 } = this.map;
    const xy = projection([satlongitude, satlatitude]); // 把真实卫星的经纬度转换为 canvas 上的坐标信息

    context2.fillStyle = this.color(nameWithNumber);
    context2.beginPath();
    context2.arc(xy[0], xy[1], 4, 0, 2 * Math.PI);
    context2.fill();

    context2.font = "bold 11px sans-serif";
    context2.textAlign = "center";
    context2.fillText(nameWithNumber, xy[0], xy[1] + 14);
  };

  render() {
    const { isLoading } = this.state;
    return (
      <div className="map-box">
        {isLoading ? (
          <div className="spinner">
            <Spin tip="Loading..." size="large" />
          </div>
        ) : null}
        <canvas className="map" ref={this.refMap} />
        <canvas className="track" ref={this.refTrack} />
        <div className="hint" />
      </div>
    );
  }

  // 根据获取的 geo data 来画世界地图（国家、经纬线）
  generateMap = (land) => {
    // 将真实地理数据按比例缩放到画布上
    const projection = geoKavrayskiy7()
      .scale(170)
      .translate([width / 2, height / 2])
      .precision(0.1);

    const graticule = geoGraticule();

    // 通过 ref 来获取 canvas (画布)
    const canvas = d3Select(this.refMap.current)
      .attr("width", width)
      .attr("height", height);

    const canvas2 = d3Select(this.refTrack.current)
      .attr("width", width)
      .attr("height", height);

    const context = canvas.node().getContext("2d");
    const context2 = canvas2.node().getContext("2d");

    // path 相当于画笔，后面会用 path 来画
    let path = geoPath().projection(projection).context(context);

    land.forEach((ele) => {
      // 画国家和国家的边界
      context.fillStyle = "#B3DDEF";
      context.strokeStyle = "#000";
      context.globalAlpha = 0.7; // alpha: 透明度
      context.beginPath();
      path(ele);
      context.fill();
      context.stroke();

      // 画经纬线
      context.strokeStyle = "rgba(220, 220, 220, 0.1)"; // a: alpha
      context.beginPath();
      path(graticule());
      context.lineWidth = 0.1;
      context.stroke();

      // 画地图的上下边界
      context.beginPath();
      context.lineWidth = 0.5;
      path(graticule.outline());
      context.stroke();
    });

    this.map = {
      projection: projection,
      graticule: graticule,
      context: context,
      context2: context2,
    };
  };
}

export default WorldMap;
