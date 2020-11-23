import React, {Component, useRef, useState} from 'react';
import {Dimensions, FlatList, Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Canvas, {CanvasRenderingContext2D} from 'react-native-canvas';
import moment from 'moment';

export type AppScreenState = {
    started: string;
    type: number;
    period: number;
    requests: DiagramRequestReq[],
    slider: number;
    canvasCtx: CanvasRenderingContext2D | null,
    chartWidth: number,
    chartHeight: number,
}

export interface DiagramRequestReq {
    date: string;
    value: number;
}

export interface DiagramRequestItem {
    id: string,
    data: DiagramRequestReq,
    selected: boolean,
}

function getNumPxWidth(value: number) {
    let signs = 1;
    let x = value;
    while(x >= 10){
        x = Math.round(x / 10);
        signs++;
    }
    return signs*5;
}

function drawVerticalLine(ctx: CanvasRenderingContext2D, x: number, y1: number, y2: number, isDashed: boolean) {
    if(isDashed) {
        let y = y1;
        while (y < y2 - 3) {
            ctx.strokeStyle = "#ffbbff";
            //ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + 3);
            //ctx.closePath();
            ctx.stroke();
            y += 6;
        }
    }
    else {
        ctx.strokeStyle = "#ffbbff";
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
        ctx.closePath();
        ctx.stroke();
    }
}

class NiceScale{
    minPoint: number;
    maxPoint: number;
    maxTicks = 10;
    tickSpacing: number = 1.0;
    range: number = 1.0;
    niceMin: number = 1.0;
    niceMax: number = 1.0;

    constructor(min: number, max:number) {
        this.minPoint = min;
        this.maxPoint = max;
        this.calculate();
    }

    private calculate()
    {
        this.range = this.niceNum(this.maxPoint - this.minPoint, false);
        this.tickSpacing = this.niceNum(this.range / (this.maxTicks - 1), true);
        this.niceMin =
            Math.floor(this.minPoint / this.tickSpacing) * this.tickSpacing;
        this.niceMax =
            Math.ceil(this.maxPoint / this.tickSpacing) * this.tickSpacing;
    }

    private niceNum( range: number, round: boolean){
        let exponent = Math.floor(Math.log10(range));
        let fraction = range / Math.pow(10, exponent);
        let niceFraction = 1.0;
        if (round)
        {
            if (fraction < 1.5)
                niceFraction = 1;
            else if (fraction < 3)
                niceFraction = 2;
            else if (fraction < 7)
                niceFraction = 5;
            else
                niceFraction = 10;
        }
        else
        {
            if (fraction <= 1)
                niceFraction = 1;
            else if (fraction <= 2)
                niceFraction = 2;
            else if (fraction <= 5)
                niceFraction = 5;
            else
                niceFraction = 10;
        }

        return niceFraction * Math.pow(10, exponent);

    }
}

export default class App extends Component<AppScreenState> {
    state = {
        started: "01.01.2020",
        type: 1,
        period: 2,
        requests: [] as DiagramRequestReq[],
        slider: 10,
        oldPeriod: 0,
        canvasCtx: null,
        chartWidth: Math.round(Dimensions.get('window').width) * 0.85,
        chartHeight: Math.round(Dimensions.get('window').width / 2) + 60
    }

    drawChart() {
        if (!this.state.canvasCtx) return;
        const ctx: CanvasRenderingContext2D = this.state.canvasCtx;
        if (ctx) {
            const _width = this.state.chartWidth;
            const _height = this.state.chartHeight;

            const offsetX = 40;
            const offsetY = 0;

            const frameX1 = 50;
            const frameX2 = _width - 10;
            const frameY1 = 20;
            const frameY2 = _height - 15;

            const width = frameX2 - frameX1;
            const height = frameY2 - frameY1;

            ctx.fillStyle = '#6c129c';
            ctx.strokeStyle = "#6c129c";
            ctx.clearRect(0, 0, _width + offsetX * 2, _height + offsetY * 2);
            ctx.lineWidth = 1;

            if (this.state.requests) {
                const data = this.state.requests.sort((a: DiagramRequestReq, b: DiagramRequestReq) => a.date > b.date ? 1 : -1)

                //find the max value by Y axis
                let maxVal = 0.0;
                for (let i = 0; i < data.length; i++) {
                    if (data[i].value > maxVal) maxVal = data[i].value;
                }

                let numScale = new NiceScale(0, maxVal);

                let yLine = numScale.niceMin;
                while (yLine <= numScale.niceMax) {
                    //horizontal line
                    const y = height - height * (yLine) / numScale.niceMax + frameY1;
                    ctx.strokeStyle = "#ffbbff";
                    ctx.beginPath();
                    ctx.closePath();
                    ctx.stroke();

                    //value text
                    if(yLine > 0) {
                        const valWidth = getNumPxWidth(yLine);
                        ctx.font = "10px Tahoma";
                        ctx.fillText(yLine.toString(), offsetX - 5 - valWidth, y + 2);
                    }

                    yLine += numScale.tickSpacing;
                }

                //draw axis X: lines
                for (let i = 0; i < data.length; i++) {
                    const x = i * (width-20) / (data.length-1) + frameX1;
                    const y = height - height * data[i].value / numScale.niceMax + frameY1;

                    //vertical line
                    drawVerticalLine(ctx, x, y, height + frameY1, true);

                    //workaround
                    ctx.beginPath();
                    ctx.closePath();
                }

                //draw chart curve
                ctx.strokeStyle = "#6c129c";
                let x = 0;
                for (let i = 0; i < data.length; i++) {
                    x = i * (width-20) / (data.length-1) + frameX1;
                    const y = height - height * data[i].value / numScale.niceMax + frameY1;

                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);

                    let val= moment(data[i].date).format("DD.MM");

                    //dot on value
                    ctx.fillRect(x-2,y-2,5,5);
                    ctx.lineWidth = 1;

                    //dot value
                    if(data[i].value>0) {
                        const valWidth = getNumPxWidth(data[i].value);
                        ctx.font = "10px Tahoma";
                        let xx = x-valWidth/2;
                        if(xx <= offsetX) xx = offsetX + 2;
                        ctx.fillText(data[i].value.toString(), xx, y - 10);
                    }

                    //axis X value
                    ctx.font = "10px Tahoma";
                    ctx.fillText(val, x - 20, +frameY1 + height + 12);
                }
                ctx.stroke();

                ctx.strokeStyle = "#6c129c";

                //OY axis - vertical
                ctx.moveTo(frameX1, frameY1 - 10);
                ctx.lineTo(frameX1, height + frameY1);
                ctx.stroke();

                //OX axis - horizontal
                ctx.moveTo(frameX1, height + frameY1);
                ctx.lineTo(width + frameX1 + 10, height + frameY1);
                ctx.stroke();

            }

        }

    }

    handleCanvas = (canvas: any) => {
        if (canvas) {
            canvas.width = this.state.chartWidth;
            canvas.height = this.state.chartHeight;
            this.setState({canvasCtx: canvas.getContext('2d')});
        }
    }

    fetchData(type: number, period: number) {
        let amountDays = 1;
        switch (period) {
            case 1 :
                amountDays = -1;
                break;
            case 2 :
                amountDays = -7;
                break;
            case 3 :
                amountDays = -30;
                break;
            case 4 :
                amountDays = -92;
                break;
            case 5 :
                amountDays = -365;
                break;
            default :
                amountDays = -1000 * 10;
                break;
        }

        setTimeout(() => {
            this.drawChart();
        });
    }

    componentDidMount(){
        this.setState({type : 1, requests : [
                {date: "Dec 25,2020", value: 10},
                {date: "Dec 24,2020", value: 7},
                {date: "Dec 23,2020", value: 2},
                {date: "Dec 22,2020", value: 15},
                {date: "Dec 21,2020", value: 75},
                {date: "Dec 20,2020", value: 22},
                {date: "Dec 19,2020", value: 47},
            ]});

        this.fetchData(this.state.type, this.state.period);
    }

    render() {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <Text>Simple Chart {this.state.chartWidth}x{this.state.chartHeight} : {this.state.requests.length}</Text>
                <View style={{backgroundColor:"#eeeeee", alignContent: "flex-start", width: "100%", height: 300, marginBottom: 16}}>
                    <Canvas ref={this.handleCanvas} />
                </View>
            </View>
        );
    }
}
