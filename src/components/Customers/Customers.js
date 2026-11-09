import React, { Component } from "react";
import axios from "axios";
import { getTransliterateSuggestions } from "@ai4bharat/indic-transliterate";

import {
  FiUser,
  FiPhone,
  FiMapPin,
  FiType,
  FiSave,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
  FiWifi,
  FiArrowRight,
  FiSparkles,
  FiEdit3,
  FiShield,
  FiGlobe,
} from "react-icons/fi";

import "./Customers.css";

const API_URL =
  "https://svs-jewellery-backend.onrender.com/api/customers";

class Customers extends Component {
  state = {
    connecting: true,
    connectionProgress: 0,
    connectionError: "",

    form: {
      customer_name: "",
      mobile_number: "",
      telugu_name: "",
      address: "",
    },

    editingCustomer: null,
    lookupComplete: false,
    checkingMobile: false,

    saving: false,
    error: "",
    success: "",

    transliterating: false,
    transliterationStatus: "idle",
    teluguManuallyEdited: false,
    teluguLocked: false,
  };

  connectionTimer = null;
  lookupTimer = null;
  transliterationTimer = null;
  resetTimer = null;

  connectionRequest = false;
  requestId = 0;
  transliterationId = 0;
  mounted = false;

  componentDidMount() {
    this.mounted = true;
    this.connectToApi();
  }

  componentWillUnmount() {
    this.mounted = false;

    clearInterval(this.connectionTimer);
    clearTimeout(this.lookupTimer);
    clearTimeout(this.transliterationTimer);
    clearTimeout(this.resetTimer);

    this.requestId += 1;
    this.transliterationId += 1;
  }

  // BACKEND CONNECTION

  connectToApi = async () => {
    if (this.connectionRequest) return;

    this.connectionRequest = true;

    clearInterval(this.connectionTimer);

    this.setState({
      connecting: true,
      connectionProgress: 0,
      connectionError: "",
    });

    let progress = 0;

    this.connectionTimer = setInterval(() => {
      progress = Math.min(
        progress + Math.floor(Math.random() * 8) + 3,
        90
      );

      if (this.mounted) {
        this.setState({ connectionProgress: progress });
      }
    }, 180);

    try {
      await axios.get(API_URL, { timeout: 30000 });

      clearInterval(this.connectionTimer);

      if (!this.mounted) return;

      this.setState({ connectionProgress: 100 });

      this.connectionTimer = setTimeout(() => {
        if (!this.mounted) return;

        this.setState({
          connecting: false,
          connectionError: "",
        });

        this.connectionRequest = false;
      }, 650);
    } catch (error) {
      clearInterval(this.connectionTimer);

      if (!this.mounted) return;

      this.connectionRequest = false;

      this.setState({
        connecting: false,
        connectionProgress: 0,
        connectionError:
          "Unable to connect. Please check your internet connection.",
      });
    }
  };

  // TELUGU TRANSLITERATION

  getTeluguSuggestion = async (word) => {
    try {
      const suggestions = await getTransliterateSuggestions(word, {
        numOptions: 1,
        showCurrentWordAsLastSuggestion: false,
        lang: "te",
      });

      return Array.isArray(suggestions)
        ? suggestions[0] || ""
        : "";
    } catch (error) {
      console.warn("Telugu transliteration failed:", error);
      return "";
    }
  };

  transliterateName = async (englishName) => {
    const cleanName = englishName.trim();

    if (!cleanName) {
      this.setState((prev) => ({
        form: {
          ...prev.form,
          telugu_name: "",
        },
        transliterationStatus: "idle",
        transliterating: false,
      }));

      return;
    }

    const currentId = ++this.transliterationId;

    this.setState({
      transliterating: true,
      transliterationStatus: "loading",
    });

    try {
      const words = cleanName.split(/\s+/);

      const convertedWords = await Promise.all(
        words.map(async (word) => {
          if (/^[A-Z]\.?$/i.test(word)) {
            return word;
          }

          const converted = await this.getTeluguSuggestion(word);

          return converted || word;
        })
      );

      if (
        !this.mounted ||
        currentId !== this.transliterationId
      ) {
        return;
      }

      const teluguName = convertedWords.join(" ");

      this.setState((prev) => {
        if (
          prev.teluguManuallyEdited ||
          prev.teluguLocked
        ) {
          return {
            transliterating: false,
            transliterationStatus: "idle",
          };
        }

        return {
          form: {
            ...prev.form,
            telugu_name: teluguName,
          },
          transliterating: false,
          transliterationStatus: "success",
        };
      });
    } catch (error) {
      if (
        !this.mounted ||
        currentId !== this.transliterationId
      ) {
        return;
      }

      this.setState({
        transliterating: false,
        transliterationStatus: "error",
      });
    }
  };

  scheduleTransliteration = (name) => {
    clearTimeout(this.transliterationTimer);

    this.transliterationId += 1;

    if (!name.trim()) {
      this.setState((prev) => ({
        form: {
          ...prev.form,
          telugu_name: "",
        },
        transliterating: false,
        transliterationStatus: "idle",
      }));

      return;
    }

    this.setState({
      transliterationStatus: "waiting",
    });

    this.transliterationTimer = setTimeout(() => {
      this.transliterateName(name);
    }, 650);
  };

  // INPUT HANDLING

  handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "mobile_number") {
      const mobile = value.replace(/\D/g, "").slice(0, 10);

      clearTimeout(this.lookupTimer);
      this.requestId += 1;

      this.setState(
        (prev) => ({
          form: {
            ...prev.form,
            mobile_number: mobile,
            ...(mobile.length !== 10
              ? {
                  customer_name: "",
                  telugu_name: "",
                  address: "",
                }
              : {}),
          },

          editingCustomer: null,
          lookupComplete: false,
          checkingMobile: mobile.length === 10,

          teluguManuallyEdited: false,
          teluguLocked: false,
          transliterationStatus: "idle",
          transliterating: false,

          error: "",
          success: "",
        }),
        () => {
          if (mobile.length === 10) {
            this.lookupTimer = setTimeout(() => {
              this.fetchCustomer(mobile);
            }, 350);
          } else {
            this.setState({ checkingMobile: false });
          }
        }
      );

      return;
    }

    if (name === "customer_name") {
      this.setState(
        (prev) => ({
          form: {
            ...prev.form,
            customer_name: value,
          },

          teluguManuallyEdited: false,
          teluguLocked: false,

          error: "",
          success: "",
        }),
        () => {
          this.scheduleTransliteration(value);
        }
      );

      return;
    }

    if (name === "telugu_name") {
      clearTimeout(this.transliterationTimer);
      this.transliterationId += 1;

      this.setState((prev) => ({
        form: {
          ...prev.form,
          telugu_name: value,
        },

        teluguManuallyEdited: true,
        teluguLocked: false,
        transliterationStatus: "manual",
        transliterating: false,

        error: "",
        success: "",
      }));

      return;
    }

    this.setState((prev) => ({
      form: {
        ...prev.form,
        [name]: value,
      },
      error: "",
      success: "",
    }));
  };

  // MOBILE LOOKUP

  fetchCustomer = async (mobile) => {
    const currentRequest = ++this.requestId;

    this.setState({
      checkingMobile: true,
      lookupComplete: false,
      error: "",
    });

    try {
      const response = await axios.get(
        `${API_URL}/mobile/${mobile}`,
        { timeout: 15000 }
      );

      if (
        !this.mounted ||
        currentRequest !== this.requestId
      ) {
        return;
      }

      const customer =
        response.data?.customer ||
        response.data?.data?.customer ||
        response.data?.data ||
        response.data;

      if (!customer || !customer.id) {
        this.setState({
          checkingMobile: false,
          lookupComplete: true,
          editingCustomer: null,
          teluguLocked: false,
          teluguManuallyEdited: false,
          success: "New customer. Please enter the details.",
        });

        return;
      }

      clearTimeout(this.transliterationTimer);
      this.transliterationId += 1;

      this.setState({
        checkingMobile: false,
        lookupComplete: true,
        editingCustomer: customer,

        form: {
          customer_name: customer.customer_name || "",
          mobile_number: mobile,
          telugu_name: customer.telugu_name || "",
          address: customer.address || "",
        },

        teluguLocked: true,
        teluguManuallyEdited: false,
        transliterating: false,
        transliterationStatus: "idle",

        success: "Existing customer found.",
      });
    } catch (error) {
      if (
        !this.mounted ||
        currentRequest !== this.requestId
      ) {
        return;
      }

      if (error.response?.status === 404) {
        this.setState({
          checkingMobile: false,
          lookupComplete: true,
          editingCustomer: null,
          teluguLocked: false,
          teluguManuallyEdited: false,
          success: "New customer. Please enter the details.",
        });
      } else {
        this.setState({
          checkingMobile: false,
          lookupComplete: true,
          error:
            error.response?.data?.message ||
            "Unable to check this mobile number.",
        });
      }
    }
  };

  // SAVE CUSTOMER

  handleSubmit = async (event) => {
    event.preventDefault();

    if (this.state.saving) return;

    const {
      customer_name,
      mobile_number,
      telugu_name,
      address,
    } = this.state.form;

    const { editingCustomer } = this.state;

    if (!customer_name.trim()) {
      this.setState({
        error: "Please enter customer name.",
      });
      return;
    }

    if (!/^[0-9]{10}$/.test(mobile_number)) {
      this.setState({
        error: "Please enter a valid 10-digit mobile number.",
      });
      return;
    }

    if (
      this.state.transliterating ||
      this.state.transliterationStatus === "waiting"
    ) {
      this.setState({
        error: "Please wait for Telugu name conversion.",
      });
      return;
    }

    const payload = {
      customer_name: customer_name.trim(),
      mobile_number: mobile_number.trim(),
      telugu_name: telugu_name.trim() || null,
      address: address.trim() || null,
    };

    this.setState({
      saving: true,
      error: "",
      success: "",
    });

    try {
      if (editingCustomer?.id) {
        await axios.put(
          `${API_URL}/${editingCustomer.id}`,
          payload
        );
      } else {
        await axios.post(API_URL, payload);
      }

      if (!this.mounted) return;

      this.setState({
        saving: false,
        success: editingCustomer
          ? "Customer updated successfully!"
          : "Customer registered successfully!",
        error: "",
      });

      this.resetTimer = setTimeout(() => {
        if (!this.mounted) return;
        this.resetForm();
      }, 1600);
    } catch (error) {
      if (!this.mounted) return;

      this.setState({
        saving: false,
        error:
          error.response?.data?.message ||
          "Unable to save customer. Please try again.",
      });
    }
  };

  // RESET FORM

  resetForm = () => {
    clearTimeout(this.lookupTimer);
    clearTimeout(this.transliterationTimer);
    clearTimeout(this.resetTimer);

    this.requestId += 1;
    this.transliterationId += 1;

    this.setState({
      form: {
        customer_name: "",
        mobile_number: "",
        telugu_name: "",
        address: "",
      },

      editingCustomer: null,
      lookupComplete: false,
      checkingMobile: false,

      saving: false,
      error: "",
      success: "",

      transliterating: false,
      transliterationStatus: "idle",
      teluguManuallyEdited: false,
      teluguLocked: false,
    });
  };

  // CONNECTION SCREEN

  renderConnectionScreen = () => {
    const {
      connectionProgress,
      connectionError,
    } = this.state;

    return (
      <div className="svs-connection-screen">
        <div className="connection-glow connection-glow-one" />
        <div className="connection-glow connection-glow-two" />

        <div className="connection-content">
          <div className="svs-logo">
            <div className="svs-logo-inner">
              <span>SVS</span>
            </div>
          </div>

          <div className="connection-brand">
            SVS JEWELLERY
          </div>

          <div className="connection-subtitle">
            A tradition of trust & elegance
          </div>

          <div className="connection-progress-track">
            <div
              className="connection-progress-fill"
              style={{
                width: `${connectionProgress}%`,
              }}
            />
          </div>

          <div className="connection-percentage">
            {connectionProgress}%
          </div>

          <div className="connection-status">
            <FiWifi />
            Connecting securely to SVS server
          </div>

          {connectionError && (
            <div className="connection-error">
              <p>{connectionError}</p>

              <button onClick={this.connectToApi}>
                <FiRefreshCw />
                Retry connection
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // TELUGU STATUS

  renderTeluguStatus = () => {
    const {
      transliterating,
      transliterationStatus,
      teluguManuallyEdited,
      teluguLocked,
    } = this.state;

    if (teluguLocked) {
      return (
        <span className="telugu-status saved">
          <FiShield /> Saved spelling
        </span>
      );
    }

    if (teluguManuallyEdited) {
      return (
        <span className="telugu-status manual">
          <FiEdit3 /> Manually edited
        </span>
      );
    }

    if (
      transliterating ||
      transliterationStatus === "waiting"
    ) {
      return (
        <span className="telugu-status loading">
          <FiRefreshCw className="spin" /> Converting...
        </span>
      );
    }

    if (transliterationStatus === "success") {
      return (
        <span className="telugu-status converted">
          <FiCheckCircle /> Auto converted
        </span>
      );
    }

    if (transliterationStatus === "error") {
      return (
        <span className="telugu-status manual">
          Enter Telugu manually
        </span>
      );
    }

    return (
      <span className="telugu-status idle">
        <FiSparkles /> Automatic
      </span>
    );
  };

  // MAIN PAGE

  render() {
    const {
      connecting,
      form,
      editingCustomer,
      checkingMobile,
      saving,
      error,
      success,
      transliterating,
      transliterationStatus,
    } = this.state;

    if (connecting) {
      return this.renderConnectionScreen();
    }

    return (
      <main className="customers-page">
        <div className="customer-bg-orb orb-one" />
        <div className="customer-bg-orb orb-two" />
        <div className="customer-bg-grid" />

        <section className="registration-card">

          <header className="registration-header">
            <div className="registration-logo">
              <span>SVS</span>
            </div>

            <div className="registration-brand">
              <span>WELCOME TO</span>
              <h1>SVS JEWELLERY</h1>
              <p>Customer Registration</p>
            </div>

            <div className="secure-indicator">
              <span className="secure-dot" />
              Connected
            </div>
          </header>

          <div className="registration-divider" />

          <div className="registration-heading">
            <div>
              <span className="eyebrow">
                <FiGlobe /> SVS CUSTOMER PORTAL
              </span>

              <h2>
                {editingCustomer
                  ? "Welcome Back!"
                  : "Your Details"}
              </h2>

              <p>
                {editingCustomer
                  ? "Your existing customer profile was found."
                  : "Enter your details to register."}
              </p>
            </div>

            {editingCustomer && (
              <span className="existing-tag">
                <FiCheckCircle /> Existing
              </span>
            )}
          </div>

          <form
            className="customer-registration-form"
            onSubmit={this.handleSubmit}
          >

            {/* MOBILE NUMBER */}

            <div className="registration-field">
              <label htmlFor="mobile_number">
                <FiPhone />
                Mobile Number
                <span className="required">*</span>
              </label>

              <div className="registration-input mobile-input">
                <span className="country-code">+91</span>

                <input
                  id="mobile_number"
                  type="tel"
                  name="mobile_number"
                  value={form.mobile_number}
                  onChange={this.handleChange}
                  placeholder="Enter 10 digit mobile number"
                  maxLength={10}
                  inputMode="numeric"
                  autoComplete="tel"
                  required
                />

                <span className="mobile-count">
                  {checkingMobile ? (
                    <FiRefreshCw className="spin" />
                  ) : (
                    `${form.mobile_number.length}/10`
                  )}
                </span>
              </div>

              <small className="field-hint">
                {checkingMobile
                  ? "Searching customer records..."
                  : "Your existing profile will be checked automatically."}
              </small>
            </div>

            {/* ENGLISH NAME */}

            <div className="registration-field">
              <label htmlFor="customer_name">
                <FiUser />
                Customer Name
                <span className="required">*</span>
              </label>

              <div className="registration-input">
                <FiUser />

                <input
                  id="customer_name"
                  type="text"
                  name="customer_name"
                  value={form.customer_name}
                  onChange={this.handleChange}
                  placeholder="Enter customer full name"
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            {/* TELUGU NAME */}

            <div className="registration-field telugu-field">
              <div className="telugu-label-row">
                <label htmlFor="telugu_name">
                  <FiType />
                  Telugu Name
                  <span className="optional">Editable</span>
                </label>

                {this.renderTeluguStatus()}
              </div>

              <div className="registration-input telugu-input">
                <FiSparkles />

                <input
                  id="telugu_name"
                  type="text"
                  name="telugu_name"
                  value={form.telugu_name}
                  onChange={this.handleChange}
                  placeholder="తెలుగు పేరు"
                  autoComplete="off"
                  lang="te"
                />

                {transliterating && (
                  <FiRefreshCw className="spin conversion-icon" />
                )}
              </div>

              <div className="telugu-helper">
                <FiSparkles />

                <span>
                  {transliterationStatus === "success"
                    ? "Automatically converted. You can edit the spelling."
                    : transliterationStatus === "manual"
                    ? "Your corrected Telugu spelling will be saved."
                    : "Type your English name above. Telugu appears automatically."}
                </span>
              </div>
            </div>

            {/* ADDRESS */}

            <div className="registration-field">
              <label htmlFor="address">
                <FiMapPin />
                Address
                <span className="optional">Optional</span>
              </label>

              <div className="registration-input">
                <FiMapPin />

                <input
                  id="address"
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={this.handleChange}
                  placeholder="Enter your address"
                  autoComplete="street-address"
                />
              </div>
            </div>

            {/* MESSAGES */}

            {error && (
              <div className="registration-message message-error">
                <FiAlertCircle />
                {error}
              </div>
            )}

            {success && (
              <div className="registration-message message-success">
                <FiCheckCircle />
                {success}
              </div>
            )}

            {/* BUTTONS */}

            <div className="registration-actions">
              <button
                type="button"
                className="registration-reset"
                onClick={this.resetForm}
                disabled={saving}
              >
                <FiRefreshCw />
                Reset
              </button>

              <button
                type="submit"
                className="registration-submit"
                disabled={
                  saving ||
                  checkingMobile ||
                  transliterating ||
                  transliterationStatus === "waiting"
                }
              >
                {saving ? (
                  <>
                    <FiRefreshCw className="spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FiSave />
                    {editingCustomer
                      ? "Update Details"
                      : "Register"}
                    <FiArrowRight />
                  </>
                )}
              </button>
            </div>
          </form>

          <footer className="registration-footer">
            <span>SVS JEWELLERY</span>
            <span>Thank you for choosing us</span>
          </footer>

        </section>
      </main>
    );
  }
}

export default Customers;