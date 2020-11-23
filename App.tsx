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
        }

    }

    handleCanvas = (canvas: any) => {
        if (canvas) {
            canvas.width = this.state.chartWidth;
            canvas.height = this.state.chartHeight;
//            this.setState({canvasCtx: canvas.getContext('2d')});
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
        let dateFrom = moment(Date.now()).add(amountDays, "d").format("DD.MM.YYYY");
        let dateTo = moment(Date.now()).add(1, period < 3 ? "d" : "M").format("DD.MM.YYYY");
        this.setState({period: period, filter_status: status, type: type});
        while (this.state.requests.length > 0 && this.state.requests[this.state.requests.length - 1].value === 0) {
            this.state.requests.pop();
        }

        this.setState({
            requests: this.state.requests
                .sort((a: DiagramRequestReq, b: DiagramRequestReq) => a.date > b.date ? 1 : -1)
        });
        setTimeout(() => {
            this.drawChart();
        });
    }

    localizeMonth(date: string) {
        return date
            .replace('Jan', 'Янв')
            .replace('Feb', 'Фев')
            .replace('Mar', 'Мар')
            .replace('Apr', 'Апр')
            .replace('May', 'Май')
            .replace('Jun', 'Июн')
            .replace('Jul', 'Июл')
            .replace('Aug', 'Авг')
            .replace('Sep', 'Сен')
            .replace('Oct', 'Окт')
            .replace('Nov', 'Ноя')
            .replace('Dec', 'Дек')
    }


    componentDidMount(){
        this.setState({type : 1, requests : [
                {date: "23.11.2020", value: 10},
                {date: "22.11.2020", value: 7},
                {date: "21.11.2020", value: 2},
                {date: "20.11.2020", value: 15},
                {date: "19.11.2020", value: 75},
                {date: "18.11.2020", value: 22},
                {date: "17.11.2020", value: 47},
                {date: "16.11.2020", value: 53},
                {date: "15.11.2020", value: 19},
            ]});
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
                <Text>Simple Chart {this.state.type}</Text>
                <View style={{backgroundColor:"#eeeeee", alignContent: "flex-start", width: "100%", height: 300, marginBottom: 16}}>
                    <Canvas ref={this.handleCanvas} />
                </View>
            </View>
        );
    }
}
