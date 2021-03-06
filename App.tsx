import React, {Component, useRef, useState} from 'react';
import {Dimensions, FlatList, Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Canvas, {CanvasRenderingContext2D} from 'react-native-canvas';
import moment from 'moment';

export type AppScreenState = {
    chartId: number,
    requests: DiagramRequestReq[[]],
    canvasCtx: CanvasRenderingContext2D | null,
    chartWidth: number,
    chartHeight: number,
}

export interface DiagramRequestReq {
    date: string;
    value: number;
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
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + 3);
            y += 6;
        }
        ctx.stroke();
    }
    else {
        ctx.strokeStyle = "#fce3fc";
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
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
    exponent: number = 0;

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

        this.exponent = exponent;
        console.log(exponent);
        return niceFraction * Math.pow(10, exponent);

    }
}

function roundFloat(x: number, exp: number){
    console.log("roundFloat: ", x);
    if(exp>0) return x;
    return x;

    let xx = x;
    exp = -exp ;
    console.log("exp:", exp);

    for(let i=0; i<exp; i++){
        xx*=10;
    }
    console.log(xx);
    xx = Math.floor(xx);
    console.log(xx);
    let zeros = "";
    for(let j=0; j<exp-2; j++){
        zeros += "0";
    }
    return "0." + zeros + xx;
}

let V = new Array<Path>(); /*vertices*/
let C 	/*current object*/
let x0,y0	/*svg offset*/

/*saves elements as global variables*/
function init()
{
    /*create control points*/
    V.push(createKnot(60,60));
    V.push(createKnot(220,300));
    V.push(createKnot(420,300));
    V.push(createKnot(700,240));

    //updateSplines(V);
}

/*creates and adds an SVG circle to represent knots*/
function createKnot(x,y):Path
{
    var C = new Path();
    C.setAttributeNS("cx",x)
    C.setAttributeNS("cy",y)
    return C
}

interface Dictionary<T> {
    [Key: string]: T;
}

class Path {
    attributes: Dictionary<string | number> = {};

    setAttributeNS(name: string, value: string | number) {
        this.attributes[name] = value;
    }

    getAttributeNS(name: string) {
        return this.attributes[name];
    }
}

/*computes spline control points*/
function updateSplines(ctx:CanvasRenderingContext2D, V) {
    /*grab (x,y) coordinates of the control points*/
    let x = new Array();
    let y = new Array();
    for (let i = 0; i < V.length; i++) {
        /*use parseInt to convert string to int*/
        x[i] = (V[i].getAttributeNS( "cx"))
        y[i] = (V[i].getAttributeNS( "cy"))
    }

    /*computes control points p1 and p2 for x and y direction*/
    let px = computeControlPoints(x);
    let py = computeControlPoints(y);

    /*updates path settings, the browser will draw the new spline*/
    for (let i = 0; i < x.length-1; i++) {
        let p = path(x[i],y[i],px.p1[i],py.p1[i],px.p2[i],py.p2[i],x[i+1],y[i+1]);
        console.log("draw Bezier curve:", p);
        //Cubic Bézier curve
        ctx.beginPath();
        ctx.moveTo(x[i], y[i]);
        ctx.bezierCurveTo(px.p1[i],py.p1[i],px.p2[i],py.p2[i],x[i+1],y[i+1]);
        ctx.stroke();
    }

    //console.log("S:", S)
}

/*creates formated path string for SVG cubic path element*/
function path(x1,y1,px1,py1,px2,py2,x2,y2)
{
    return "M "+x1+" "+y1+" C "+px1+" "+py1+" "+px2+" "+py2+" "+x2+" "+y2;
}

/*computes control points given knots K, this is the brain of the operation*/
function computeControlPoints(K)
{
    let p1=new Array();
    let p2=new Array();
    let n = K.length-1;

    /*rhs vector*/
    let a=new Array();
    let b=new Array();
    let c=new Array();
    let r=new Array();

    /*left most segment*/
    a[0]=0;
    b[0]=2;
    c[0]=1;
    r[0] = K[0]+2*K[1];

    /*internal segments*/
    for (let i = 1; i < n - 1; i++)
    {
        a[i]=1;
        b[i]=4;
        c[i]=1;
        r[i] = 4 * K[i] + 2 * K[i+1];
    }

    /*right segment*/
    a[n-1]=2;
    b[n-1]=7;
    c[n-1]=0;
    r[n-1] = 8*K[n-1]+K[n];

    /*solves Ax=b with the Thomas algorithm (from Wikipedia)*/
    for (let i = 1; i < n; i++)
    {
        let m = a[i]/b[i-1];
        b[i] = b[i] - m * c[i - 1];
        r[i] = r[i] - m*r[i-1];
    }

    p1[n-1] = r[n-1]/b[n-1];
    for (let i = n - 2; i >= 0; --i)
        p1[i] = (r[i] - c[i] * p1[i+1]) / b[i];

    /*we have p1, now compute p2*/
    for (let i=0;i<n-1;i++)
        p2[i]=2*K[i+1]-p1[i+1];

    p2[n-1]=0.5*(K[n]+p1[n-1]);

    return {p1:p1, p2:p2};
}

/*code from http://stackoverflow.com/questions/442404/dynamically-retrieve-html-element-x-y-position-with-javascript*/
function getOffset( el )
{
    let _x = 0;
    let _y = 0;
    while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
        _x += el.offsetLeft - el.scrollLeft;
        _y += el.offsetTop - el.scrollTop;
        el = el.offsetParent;
    }
    return { top: _y, left: _x };
}


export default class App extends Component<AppScreenState> {
    state = {
        chartId: 0,
        requests: [[]] as DiagramRequestReq[[]],
        canvasCtx: null,
        chartWidth: Math.round(Dimensions.get('window').width) * 0.85,
        chartHeight: Math.round(Dimensions.get('window').width / 2) + 60
    }

    drawChart() {
        //init();
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

            ctx.strokeRect(0, 0, _width, _height);

            if (this.state.requests) {
                const data = this.state.requests[this.state.chartId].sort((a: DiagramRequestReq, b: DiagramRequestReq) => a.date > b.date ? 1 : -1)

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

                    //value text
                    if(yLine > 0) {
                        let yText = roundFloat(yLine, numScale.exponent);
                        const valWidth = getNumPxWidth(yText);
                        ctx.font = "10px Tahoma";
                        ctx.fillText(yText.toString(), offsetX - 5 - valWidth, y + 2);
                    }

                    yLine += numScale.tickSpacing;
                }

                //draw axis X: lines
                for (let i = 0; i < data.length; i++) {
                    const x = i * (width-20) / (data.length-1) + frameX1;
                    const y = height - height * data[i].value / numScale.niceMax + frameY1;

                    //vertical line
                    drawVerticalLine(ctx, x, y, height + frameY1, false);

                    //workaround
                    ctx.beginPath();
                    ctx.closePath();
                }

                var P = new Array<Path>();
                //draw chart curve
                ctx.strokeStyle = "#6c129c";
                let x = 0;
                for (let i = 0; i < data.length; i++) {
                    x = i * (width-20) / (data.length-1) + frameX1;
                    const y = height - height * data[i].value / numScale.niceMax + frameY1;

                    P.push(createKnot(x,y));

                    if(false) {
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }

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

                console.log(P);
                updateSplines(ctx, P);

                ctx.beginPath();
                ctx.closePath();

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

    fetchData(chartNum) {
        this.setState({ chartId: chartNum,
            requests: [
                [
                    {date: "Dec 25,2020", value: Math.floor(Math.random()*100)},
                    {date: "Dec 24,2020", value: Math.floor(Math.random()*100)},
                    {date: "Dec 23,2020", value: Math.floor(Math.random()*100)},
                    {date: "Dec 22,2020", value: Math.floor(Math.random()*100)},
                    {date: "Dec 21,2020", value: Math.floor(Math.random()*100)},
                    {date: "Dec 20,2020", value: Math.floor(Math.random()*100)},
                    {date: "Dec 19,2020", value: Math.floor(Math.random()*100)},
                ],
                [
                    {date: "Dec 25,2020", value: Math.random()*0.02},
                    {date: "Nov 24,2020", value: Math.random()*0.02},
                    {date: "Oct 23,2020", value: Math.random()*0.02},
                    {date: "Sep 22,2020", value: Math.random()*0.02},
                    {date: "Aug 21,2020", value: Math.random()*0.02},
                    {date: "Jul 20,2020", value: Math.random()*0.02},
                    {date: "Jun 19,2020", value: Math.random()*0.02},
                ],
                [
                    {date: "Dec 25,2020", value: Math.floor(Math.random()*100000)},
                    {date: "Dec 24,2020", value: Math.floor(Math.random()*100000)},
                    {date: "Dec 23,2020", value: Math.floor(Math.random()*100000)},
                    {date: "Dec 22,2020", value: Math.floor(Math.random()*100000)},
                    {date: "Dec 21,2020", value: Math.floor(Math.random()*100000)},
                    {date: "Dec 20,2020", value: Math.floor(Math.random()*100000)},
                    {date: "Dec 19,2020", value: Math.floor(Math.random()*100000)},
                ],
            ]
        });

        setTimeout(() => {
            this.drawChart();
        });
    }

    componentDidMount() {
        this.setState({ chartId: 1 });

        setTimeout(() => {

                this.fetchData(this.state.chartId);

        }, 100);

    }

    render() {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "flex-start",
                    alignItems: "center",
                }}
            >
                <View style={[{flex: 2, alignContent: "center", flexDirection: "row"}, {
                    alignItems: "flex-start", marginTop: 240,
                }]}>
                    <TouchableOpacity
                        onPress={() => {
                            this.fetchData(0);
                        }}
                        style={this.state.chartId === 0 ? viewsStyles.btnEnabled : viewsStyles.btnDisabled}>
                        <View>
                            <Text
                                style={this.state.chartId === 0 ? viewsStyles.btnTextEnabled : viewsStyles.btnTextDisabled}>Chart 1</Text></View></TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            this.fetchData(1);
                        }}
                        style={this.state.chartId === 1 ? viewsStyles.btnEnabled : viewsStyles.btnDisabled}>
                        <View>
                            <Text
                                style={this.state.chartId === 1 ? viewsStyles.btnTextEnabled : viewsStyles.btnTextDisabled}>Chart 2</Text></View></TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            this.fetchData(2);
                        }}
                        style={this.state.chartId === 2 ? viewsStyles.btnEnabled : viewsStyles.btnDisabled}>
                        <View>
                            <Text
                                style={this.state.chartId === 2 ? viewsStyles.btnTextEnabled : viewsStyles.btnTextDisabled}>Chart 3, ₽</Text></View></TouchableOpacity>
                </View>
                <Text>Simple Chart {this.state.chartWidth}x{this.state.chartHeight} : {this.state.chartId}</Text>
                <View style={{backgroundColor:"#eeeeee", alignContent: "flex-start", width: "100%", height: 300, marginBottom: 16}}>
                    <Canvas ref={this.handleCanvas} />
                </View>
            </View>
        );
    }
}


const viewsStyles = StyleSheet.create({
    btnEnabled: {
        margin: 4,
        borderColor: '#6C12C9',
        borderWidth: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: "#6C129C",
        borderRadius:4,
    },
    btnDisabled: {
        margin: 4,
        borderWidth: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#ffffff',
        borderColor: '#6C12C9',
        borderRadius:4,
    },
    btnTextEnabled: {color: "#ffffff", fontSize: 10},
    btnTextDisabled: {color: '#6C12C9', fontSize: 10},
    textEnabled: {
        marginLeft: 16, color: "#6C12C9", lineHeight: 20, fontStyle: "normal", fontWeight: "bold",
        fontSize: 16, overflow: "hidden",
    },
    textDisabled: {
        marginLeft: 16, color: "#777777", lineHeight: 20, fontStyle: "normal", fontWeight: "normal",
        fontSize: 16, overflow: "hidden",
    }

});