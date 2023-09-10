import throttle from "lodash/throttle";
import Kinet from "kinet";
import { Color, convertColor, isGradient, positive } from "./helpers";
import Magnetic from "./Magnetic";

export type Options = {
  licenseKey: string | null;
  color: string | string[];
  opacity: number;
  size: number;
  focusableElements: string;
  focusableElementsOffsetX: number;
  focusableElementsOffsetY: number;
  zIndex: number;
  invert: boolean;
  dotColor: string | null;
  dotSize: number;
  magnetic: boolean;
  mode: "normal" | "bouncy" | "slow";
  radius: number;
  font: string;
  fontWeight: number;
  fontSize: number;
  fontColor: string;
  tooltipPadding: number;
  kineticMorphing: boolean;
};
export default class Blobity {
    private readonly canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D;
    private readonly kinetInstance: Kinet;
    private readonly throttledMouseMove: (event: MouseEvent) => void;
    private options: Options = {
        color: "rgb(180, 180, 180)",
        opacity: 1,
        licenseKey: null,
        size: 40,
        focusableElements:
      "[data-blobity], a:not([data-no-blobity]), button:not([data-no-blobity]), [data-blobity-tooltip]",
        focusableElementsOffsetX: 0,
        focusableElementsOffsetY: 0,
        zIndex: -1,
        invert: false,
        dotColor: null,
        dotSize: 8,
        magnetic: true,
        mode: "normal",
        radius: 4,
        font: "sans-serif",
        fontWeight: 400,
        fontSize: 40,
        fontColor: "#000000",
        tooltipPadding: 12,
        kineticMorphing: true,
    };
    private initialized = false;
    private color: Color | Color[] = { r: 0, g: 0, b: 0 };
    private fontColor: Color = { r: 0, g: 0, b: 0 };
    private stickedToElement: HTMLElement | null = null;
    private stickedToElementMutationObserver: MutationObserver;
    private sticketToElementTooltip: string | null = null;
    private disablingStickedToElementTimeout: NodeJS.Timeout | null = null;
    private isActive = true;
    private globalStyles?: HTMLStyleElement;
    private destroyed = false;
    private currentMagnetic: Magnetic | null = null;
    private kinetPresets = {
        normal: {
            acceleration: 0.2,
            friction: 0.35,
        },
        bouncy: {
            acceleration: 0.1,
            friction: 0.28,
        },
        slow: {
            acceleration: 0.06,
            friction: 0.35,
        },
    };
    private lastKnownCoordinates: { x: number; y: number } = { x: 0, y: 0 };
    private currentOffsetX = 0;
    private currentOffsetY = 0;

    private manuallySetFocusedElement: HTMLElement | null = null;
    private manuallySetTooltipText: string | null = null;

    private disableTimeStamp: number = Date.now();

    private prefersReducedMotionMediaQuery: MediaQueryList;
    private reduceMotionSetting = false;
    private kinetDefaultMethod: "animate" | "set" = "animate";

    constructor(options?: Partial<Options>) {
        this.canvas = document.createElement("canvas");
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext("2d")!;

        this.updateOptions({ ...options });
        if (!this.options.licenseKey) {
            console.warn(
                "Valid license number for Blobity is required. You can get one at https://blobity.gmrchk.com."
            );
        }

        this.kinetInstance = new Kinet({
            names: [
                "x",
                "y",
                "opacity",
                "textOpacity",
                "width",
                "height",
                "radius",
                "scale",
            ],
            acceleration: this.kinetPresets[this.options.mode].acceleration,
            friction: this.kinetPresets[this.options.mode].friction,
        });

        this.kinetInstance._instances.scale._acceleration = 0.06;
        this.kinetInstance._instances.scale._friction = 1 - 0.1;

        this.kinetInstance.set("x", window.innerWidth / 2);
        this.kinetInstance.set("y", window.innerHeight / 2);
        this.kinetInstance.set("width", this.options.size);
        this.kinetInstance.set("height", this.options.size);
        this.kinetInstance.set("opacity", 0);
        this.kinetInstance.set("textOpacity", 0);
        this.kinetInstance.set("radius", this.options.size / 2);
        this.kinetInstance.set("scale", 100);

        this.kinetInstance.on("tick", (instances) => {
            this.render(
                instances.x.current,
                instances.y.current,
                instances.width.current,
                instances.height.current,
                instances.radius.current,
                instances.x.velocity,
                instances.y.velocity,
                instances.opacity.current,
                instances.scale.current,
                instances.textOpacity.current
            );
        });

        this.throttledMouseMove = throttle(this.mouseMove);

        window.addEventListener("resize", this.resize, { passive: true });
        this.resize();

        window.addEventListener("mousemove", this.throttledMouseMove, {
            passive: true,
        });
        document.addEventListener("mouseenter", this.windowMouseEnter);
        document.addEventListener("mouseleave", this.windowMouseLeave);

        document.addEventListener("mouseover", this.focusableElementMouseEnter);
        document.addEventListener("mouseout", this.focusableElementMouseLeave);

        document.addEventListener("mousedown", this.mouseDown);
        document.addEventListener("mouseup", this.mouseUp);

        document.addEventListener("touchstart", this.disable);
        document.addEventListener("touchend", this.disable);
        document.addEventListener("mousemove", this.enable, {
            passive: true,
        });

        this.prefersReducedMotionMediaQuery = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );
        this.prefersReducedMotionMediaQuery.addEventListener(
            "change",
            this.updatePrefersReducedMotionSetting
        );
        this.updatePrefersReducedMotionSetting();

        this.stickedToElementMutationObserver = new MutationObserver(
            (mutations) => {
                for (const mutation of mutations) {
                    mutation.removedNodes.forEach((el: any) => {
                        if (
                            el === this.stickedToElement ||
              el.contains(this.stickedToElement)
                        ) {
                            this.resetStickedToElement();
                            this.resetStickedToElementMutationObserver();
                            this.resetMagnetic();
                            this.reset();
                        }
                    });
                }
            }
        );
    }

    public updateOptions = (newOptions: Partial<Options>) => {
        this.options = {
            ...this.options,
            ...newOptions,
        };

        if (Array.isArray(this.options.color)) {
            this.color = this.options.color.map((color) => convertColor(color));
        } else {
            this.color = convertColor(this.options.color);
        }

        this.fontColor = convertColor(this.options.fontColor);

        if (this.options.invert) {
            this.color = convertColor("rgb(255, 255, 255)");
        }

        if (this.options.dotColor) {
            if (this.globalStyles) {
                document.head.removeChild(this.globalStyles);

                this.globalStyles = undefined;
            }

            if (!this.globalStyles) {
                this.globalStyles = document.createElement("style");
                this.globalStyles.setAttribute("data-blobity-global-styles", "");
                document.head.appendChild(this.globalStyles);
            }
        } else {
            if (this.globalStyles) {
                document.head.removeChild(this.globalStyles);
            }

            this.globalStyles = undefined;
        }

        this.canvas.style.cssText = `
            position: fixed;
            z-index: -1;
            top: 0;
            left: 0;
            pointer-events: none;
            opacity: 1;
            will-change: transform;
            overflow: visible;
            opacity: ${this.options.opacity}; 
            z-index: ${this.options.invert ? 2147483647 : this.options.zIndex}; 
            ${this.options.invert && "mix-blend-mode: difference"};
        `;

        this.currentOffsetX = this.options.focusableElementsOffsetX;
        this.currentOffsetY = this.options.focusableElementsOffsetY;

        this.resize();

        if (this.kinetInstance) {
            Object.entries(this.kinetInstance._instances)
                .filter(([name]) => name !== "scale")
                .forEach(([, instance]) => {
                    instance._friction =
            1 - this.kinetPresets[this.options.mode].friction;
                    instance._acceleration =
            this.kinetPresets[this.options.mode].acceleration;
                });

            if (!this.stickedToElement && !this.sticketToElementTooltip) {
                if (newOptions.radius !== undefined) {
                    this.kinetInstance[this.kinetDefaultMethod](
                        "radius",
                        this.options.radius
                    );
                }

                this.kinetInstance[this.kinetDefaultMethod]("width", this.options.size);
                this.kinetInstance[this.kinetDefaultMethod](
                    "height",
                    this.options.size
                );
                this.kinetInstance[this.kinetDefaultMethod](
                    "x",
                    this.lastKnownCoordinates.x - this.options.size / 2
                );
                this.kinetInstance[this.kinetDefaultMethod](
                    "y",
                    this.lastKnownCoordinates.y - this.options.size / 2
                );
            }
        }
    };

    public bounce() {
        if (this.reduceMotionSetting) {
            this.kinetInstance.set("scale", 100);
        } else {
            this.kinetInstance.set("scale", 97);
            this.kinetInstance._instances.scale.velocity = 3;
            this.kinetInstance.animate("scale", 100);
        }
    }

    public destroy = () => {
        if (this.destroyed) {
            return;
        }

        window.removeEventListener("resize", this.resize);

        window.removeEventListener("mousemove", this.throttledMouseMove);
        document.removeEventListener("mouseenter", this.windowMouseEnter);
        document.removeEventListener("mouseleave", this.windowMouseLeave);

        document.removeEventListener("mouseover", this.focusableElementMouseEnter);
        document.removeEventListener("mouseout", this.focusableElementMouseLeave);

        document.removeEventListener("touchstart", this.disable);
        document.removeEventListener("touchend", this.disable);
        document.removeEventListener("mousemove", this.enable);

        this.prefersReducedMotionMediaQuery.removeEventListener(
            "change",
            this.updatePrefersReducedMotionSetting
        );

        document.body.removeChild(this.canvas);

        if (this.globalStyles) {
            document.head.removeChild(this.globalStyles);
        }

        this.destroyed = true;
    };

    private disable = () => {
    // sometimes we can have false positive enable called right after
    // so we save the time here so we can prevent it in enable method
        this.disableTimeStamp = Date.now();

        this.isActive = false;
        this.clear();
    };

    private enable = () => {
        const disableAge = Date.now() - this.disableTimeStamp;

        if (disableAge > 16) {
            // let's take one cca frame as a limit
            this.isActive = true;
        }
    };

    private updatePrefersReducedMotionSetting = () => {
        this.reduceMotionSetting = this.prefersReducedMotionMediaQuery.matches;
        this.kinetDefaultMethod = this.reduceMotionSetting ? "set" : "animate";
    };

    public focusElement = (element: HTMLElement) => {
        this.manuallySetTooltipText = null;
        this.manuallySetFocusedElement = element;

        this.highlightElement(element);
    };

    public showTooltip = (text: string) => {
        this.manuallySetFocusedElement = null;
        this.manuallySetTooltipText = text;

        this.displayTooltip(
            text,
            this.lastKnownCoordinates.x,
            this.lastKnownCoordinates.y
        );
    };

    public reset = () => {
        this.manuallySetFocusedElement = null;
        this.manuallySetTooltipText = null;

        if (this.activeTooltip) {
            this.displayTooltip(
                this.activeTooltip,
                this.lastKnownCoordinates.x,
                this.lastKnownCoordinates.y
            );

            return;
        }

        if (this.activeFocusedElement) {
            this.highlightElement(this.activeFocusedElement);

            return;
        }

        this.resetMorph(
            this.lastKnownCoordinates.x - this.options.size / 2,
            this.lastKnownCoordinates.y - this.options.size / 2
        );
    };

    private focusableElementMouseEnter = (event: MouseEvent) => {
        if (this.isActive && event.target) {
            const element = (event.target as HTMLElement).closest(
                this.options.focusableElements
            ) as HTMLElement;

            if (element) {
                this.stickedToElement = element;
                const tooltip = element.getAttribute("data-blobity-tooltip");

                if (element && tooltip != undefined) {
                    this.sticketToElementTooltip = tooltip;
                }

                this.currentOffsetX = element.getAttribute("data-blobity-offset-x")
                    ? parseInt(String(element.getAttribute("data-blobity-offset-x")))
                    : this.options.focusableElementsOffsetX;
                this.currentOffsetY = element.getAttribute("data-blobity-offset-y")
                    ? parseInt(String(element.getAttribute("data-blobity-offset-y")))
                    : this.options.focusableElementsOffsetY;

                this.stickedToElementMutationObserver.observe(document.body, {
                    childList: true,
                    subtree: true,
                });

                const magnetic = element.getAttribute("data-blobity-magnetic");
                if (!this.reduceMotionSetting) {
                    if (
                        magnetic === "true" ||
            (this.options.magnetic && magnetic !== "false")
                    ) {
                        this.currentMagnetic = new Magnetic(element);
                        this.currentMagnetic.onTick = () => {
                            if (
                                !this.activeTooltip &&
                this.activeFocusedElement === element
                            ) {
                                const { width, height, x, y } = element.getBoundingClientRect();
                                const radius = element.getAttribute("data-blobity-radius");

                                this.kinetInstance[this.kinetDefaultMethod]("textOpacity", 0);
                                this.morph(
                                    {
                                        width: width + this.currentOffsetX * 2,
                                        height: height + this.currentOffsetY * 2,
                                        x: x - this.currentOffsetX,
                                        y: y - this.currentOffsetY,
                                    },
                                    radius != undefined ? parseInt(radius) : this.options.radius
                                );
                            }
                        };
                    }
                }
            }
        }
    };

    private focusableElementMouseLeave = (event: MouseEvent) => {
        if (event.target) {
            const element = (event.target as HTMLElement).closest(
                this.options.focusableElements
            ) as HTMLElement;

            if (element) {
                this.resetStickedToElement();
                this.resetStickedToElementMutationObserver();

                this.currentOffsetX = this.options.focusableElementsOffsetX;
                this.currentOffsetY = this.options.focusableElementsOffsetY;

                this.resetMagnetic();

                this.resetMorph(event.clientX, event.clientY);
            }
        }
    };

    private mouseDown = () => {
        this.kinetInstance[this.kinetDefaultMethod]("scale", 97);
    };

    private mouseUp = () => {
        this.bounce();
    };

    private windowMouseEnter = () => {
        this.kinetInstance[this.kinetDefaultMethod]("opacity", 1);
    };

    private windowMouseLeave = () => {
        this.kinetInstance[this.kinetDefaultMethod]("opacity", 0);
    };

    private get activeTooltip() {
        return this.manuallySetTooltipText || this.sticketToElementTooltip;
    }

    private get activeFocusedElement() {
        return this.manuallySetFocusedElement || this.stickedToElement;
    }

    private highlightElement = (element: HTMLElement) => {
        const { width, height, x, y } = element.getBoundingClientRect();
        const radius = element.getAttribute("data-blobity-radius");
        this.kinetInstance[this.kinetDefaultMethod]("textOpacity", 0);
        this.morph(
            {
                width: width + this.currentOffsetX * 2,
                height: height + this.currentOffsetY * 2,
                x: x - this.currentOffsetX,
                y: y - this.currentOffsetY,
            },
            radius != undefined ? parseInt(radius) : this.options.radius
        );
    };

    private displayTooltip = (text: string, x: number, y: number) => {
        this.ctx.font = `${this.options.fontWeight} ${this.options.fontSize}px ${this.options.font}`;
        this.ctx.textBaseline = "bottom";
        this.ctx.textAlign = "left";
        const { actualBoundingBoxAscent, width } = this.ctx.measureText(text);
        const padding = this.options.tooltipPadding * 2;

        this.kinetInstance[this.kinetDefaultMethod]("textOpacity", 100);
        this.morph(
            {
                x: x + 6,
                y: y + 6,
                width: width + padding,
                height: actualBoundingBoxAscent + padding,
            },
            4
        );
    };

    private mouseMove = (event: MouseEvent) => {
        if (this.initialized) {
            this.lastKnownCoordinates = {
                x: event.clientX,
                y: event.clientY,
            };

            if (this.activeTooltip) {
                this.displayTooltip(this.activeTooltip, event.clientX, event.clientY);
            } else if (this.activeFocusedElement) {
                this.highlightElement(this.activeFocusedElement);
            } else {
                this.kinetInstance[this.kinetDefaultMethod]("textOpacity", 0);
                this.kinetInstance[this.kinetDefaultMethod](
                    "x",
                    event.clientX - this.options.size / 2
                );
                this.kinetInstance[this.kinetDefaultMethod](
                    "y",
                    event.clientY - this.options.size / 2
                );
                this.kinetInstance[this.kinetDefaultMethod]("width", this.options.size);
                this.kinetInstance[this.kinetDefaultMethod](
                    "height",
                    this.options.size
                );
                this.kinetInstance[this.kinetDefaultMethod](
                    "radius",
                    this.options.size / 2
                );
            }
        } else {
            this.initialized = true;
            this.kinetInstance.set("x", event.clientX - this.options.size / 2);
            this.kinetInstance.set("y", event.clientY - this.options.size / 2);
            this.kinetInstance[this.kinetDefaultMethod]("opacity", 1);
        }
    };

    private morph(
        {
            width,
            height,
            x,
            y,
        }: {
      width: number;
      height: number;
      x: number;
      y: number;
    },
        radius: number
    ) {
        if (this.disablingStickedToElementTimeout) {
            clearTimeout(this.disablingStickedToElementTimeout);
        }
        this.kinetInstance[this.kinetDefaultMethod]("radius", radius);
        this.kinetInstance[this.kinetDefaultMethod]("width", width);
        this.kinetInstance[this.kinetDefaultMethod]("height", height);
        this.kinetInstance[this.kinetDefaultMethod]("x", x);
        this.kinetInstance[this.kinetDefaultMethod]("y", y);
    }

    private resetMorph = (x: number, y: number) => {
        this.disablingStickedToElementTimeout = setTimeout(() => {
            this.kinetInstance[this.kinetDefaultMethod]("width", this.options.size);
            this.kinetInstance[this.kinetDefaultMethod]("height", this.options.size);
            this.kinetInstance[this.kinetDefaultMethod](
                "radius",
                this.options.size / 2
            );
            this.kinetInstance[this.kinetDefaultMethod]("x", x);
            this.kinetInstance[this.kinetDefaultMethod]("y", y);
        });
    };

    private clear = () => {
        this.ctx.resetTransform();
        this.ctx.rotate(0);
        this.ctx.clearRect(
            -20,
            -20,
            window.innerWidth * window.devicePixelRatio + 20,
            window.innerHeight * window.devicePixelRatio + 20
        );
    };

    private render(
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number,
        velocityX: number,
        velocityY: number,
        opacity: number,
        scale: number,
        textOpacity: number
    ) {
        this.clear();

        const maxDelta = this.activeFocusedElement
            ? 0
            : (this.options.size / 8) * 7;

        x = x * window.devicePixelRatio;
        y = y * window.devicePixelRatio;
        width =
      (this.activeTooltip ? width : Math.max(width, maxDelta)) *
      window.devicePixelRatio;
        height =
      (this.activeTooltip ? height : Math.max(height, maxDelta)) *
      window.devicePixelRatio;
        radius = radius * window.devicePixelRatio;
        velocityX = velocityX * window.devicePixelRatio;
        velocityY = velocityY * window.devicePixelRatio;

        if (this.isActive) {
            const ctx = this.ctx;
            ctx.globalAlpha = opacity;

            ctx.setTransform(scale / 100, 0, 0, scale / 100, x, y);

            ctx.translate(width, height);
            ctx.scale(scale / 100, scale / 100);
            ctx.translate(-width, -height);

            const activateBlur =
        this.options.kineticMorphing &&
        Math.abs(width - this.options.size * window.devicePixelRatio) < 10 &&
        Math.abs(height - this.options.size * window.devicePixelRatio) < 10 &&
        Math.abs(radius - (this.options.size * window.devicePixelRatio) / 2) <
          10;

            if (activateBlur) {
                const angle = (Math.atan2(velocityY, velocityX) * 180) / Math.PI + 180;

                ctx.translate(radius, radius);
                ctx.rotate((angle * Math.PI) / 180);
                ctx.translate(-radius, -radius);
            }

            const cumulativeVelocity = activateBlur
                ? Math.min(
                    Math.sqrt(
                        Math.pow(Math.abs(velocityX), 2) +
                    Math.pow(Math.abs(velocityY), 2)
                    ) * 2, // so the distortion starts sooner
                    60 // shape becomes too distorted once velocity is too big
                ) / 2
                : 0;

            ctx.beginPath();
            ctx.moveTo(radius, 0);
            ctx.arcTo(
                width + cumulativeVelocity,
                cumulativeVelocity / 2,
                width + cumulativeVelocity,
                height + cumulativeVelocity / 2,
                positive(radius - cumulativeVelocity / 2)
            );
            ctx.arcTo(
                width + cumulativeVelocity,
                height - cumulativeVelocity / 2,
                cumulativeVelocity,
                height - cumulativeVelocity / 2,
                positive(radius - cumulativeVelocity / 2)
            );
            ctx.arcTo(0, height, 0, 0, positive(radius));
            ctx.arcTo(0, 0, width, 0, positive(radius));
            ctx.closePath();

            if (isGradient(this.color!)) {
                const gradient = ctx.createLinearGradient(0, 0, width, height);

                const length = this.color.length;
                this.color.forEach((color, index) => {
                    gradient.addColorStop(
                        (1 / (length - 1)) * index,
                        `rgb(${color.r}, ${color.g}, ${color.b})`
                    );
                });

                ctx.strokeStyle = gradient;
            } else {
                ctx.strokeStyle = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
            }
            ctx.lineWidth = 1;

            if ((this.activeFocusedElement || this.activeTooltip) && !activateBlur) {
                ctx.stroke();
            }

            if (this.activeTooltip) {
                ctx.setTransform(scale / 100, 0, 0, scale / 100, x, y);

                this.ctx.textBaseline = "top";
                this.ctx.textAlign = "left";
                this.ctx.font = `${this.options.fontWeight} ${
                    this.options.fontSize * window.devicePixelRatio * (scale / 100)
                }px ${this.options.font}`;
                ctx.fillStyle = `rgba(
                    ${this.fontColor.r}, ${this.fontColor.g}, 
                    ${this.fontColor.b}, ${textOpacity / 100})`;
                ctx.fillText(
                    this.activeTooltip,
                    this.options.tooltipPadding * window.devicePixelRatio -
            ((scale - 100) / 100) * width,
                    this.options.tooltipPadding * window.devicePixelRatio -
            ((scale - 100) / 100) * height
                );
            }
        }
    }

    private resize = () => {
        this.ctx.canvas.style.width = `${window.innerWidth}px`;
        this.ctx.canvas.style.height = `${window.innerHeight}px`;

        this.ctx.canvas.width = window.innerWidth * window.devicePixelRatio;
        this.ctx.canvas.height = window.innerHeight * window.devicePixelRatio;

        if (window.devicePixelRatio > 1) {
            this.ctx.imageSmoothingEnabled = false;
        }
    };

    private resetStickedToElement = () => {
        this.stickedToElement = null;
        this.sticketToElementTooltip = null;
    };

    private resetStickedToElementMutationObserver = () => {
        this.stickedToElementMutationObserver.disconnect();
    };

    private resetMagnetic = () => {
        if (this.currentMagnetic) {
            this.currentMagnetic?.destroy();
            this.currentMagnetic.onTick = null;
            this.currentMagnetic = null;
        }
    };
}
