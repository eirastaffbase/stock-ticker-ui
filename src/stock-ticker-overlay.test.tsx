import React from "react"
import {screen, render} from "@testing-library/react"

import {StockTickerOverlay} from "./stock-ticker-overlay";

describe("StockTickerOverlay", () => {
    it("should render the component", () => {
        render(<StockTickerOverlay contentLanguage="en_US" symbol="World" weeks="2"/>);

        expect(screen.getByText(/Hello World/)).toBeInTheDocument();
    })
})
